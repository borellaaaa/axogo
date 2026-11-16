#!/usr/bin/env python3
"""Compila o APK do AxoGo sem Gradle nem Android Studio.

Usa só pacotes de registros públicos:
  - aapt2            (pip install aapt2)           -> recursos + AndroidManifest
  - @drxiaozhi/minapk (npm i @drxiaozhi/minapk)   -> traz ecj (compilador Java), d8.jar (classes.dex) e apksigner.jar
  - android.jar      (API 34, só para compilar)

Uso:  python3 tools/build_apk.py [saida.apk]
Variáveis: AXO_ANDROID_JAR, AXO_NPM (pasta com node_modules), AXO_KS / AXO_KS_PASS
"""
import os, re, shutil, struct, subprocess, sys, zipfile, glob, json

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
AND = os.path.join(ROOT, 'android', 'app', 'src', 'main')
ANDROID_JAR = os.environ.get('AXO_ANDROID_JAR', '/home/claude/tools/android.jar')
NPM = os.environ.get('AXO_NPM', '/home/claude/apkbuild')
KS = os.environ.get('AXO_KS', os.path.join(ROOT, 'android', 'keys', 'axogo-teste.jks'))
KS_PASS = os.environ.get('AXO_KS_PASS', 'axogoteste')
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(NPM, 'AxoGo.apk'))
B = os.path.join(NPM, 'out')
TOOLS = os.path.join(NPM, 'node_modules', '@drxiaozhi', 'minapk', 'tools')


def run(cmd, **kw):
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, **kw)
    out = '\n'.join(l for l in r.stdout.splitlines() if 'JAVA_TOOL_OPTIONS' not in l)
    if r.returncode != 0:
        print(out[-3000:]); sys.exit('falhou: ' + ' '.join(cmd[:3]))
    return out


def aapt2_bin():
    import aapt2
    p = os.path.join(os.path.dirname(aapt2.__file__), 'bin', 'Linux', 'aapt2')
    os.chmod(p, 0o755)
    return p


def main():
    gradle = open(os.path.join(ROOT, 'android', 'app', 'build.gradle'), encoding='utf-8').read()
    vcode = re.search(r"def shellCode = (\d+)", gradle).group(1)
    vname = re.search(r"def shellName = '([^']+)'", gradle).group(1)
    shutil.rmtree(B, ignore_errors=True)
    os.makedirs(B)

    # 1) manifest com o nome do pacote (no Gradle ele vem do "namespace")
    man = open(os.path.join(AND, 'AndroidManifest.xml'), encoding='utf-8').read()
    man = man.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
                      '<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.axogo.app">')
    assert 'package="com.axogo.app"' in man
    open(os.path.join(B, 'AndroidManifest.xml'), 'w', encoding='utf-8').write(man)

    # 2) app web como versão base offline
    run([sys.executable, os.path.join(ROOT, 'tools', 'make_manifest.py')])
    shutil.copytree(os.path.join(ROOT, 'web'), os.path.join(B, 'assets', 'web'))

    # 3) recursos
    aapt = aapt2_bin()
    run([aapt, 'compile', '--dir', os.path.join(AND, 'res'), '-o', os.path.join(B, 'res.zip')])
    run([aapt, 'link', '-o', os.path.join(B, 'base.apk'), '-I', ANDROID_JAR,
         '--manifest', os.path.join(B, 'AndroidManifest.xml'), '-A', os.path.join(B, 'assets'),
         '--java', os.path.join(B, 'gen'), '--min-sdk-version', '24', '--target-sdk-version', '34',
         '--version-code', vcode, '--version-name', vname, os.path.join(B, 'res.zip')])

    # 4) Java -> .class -> classes.dex
    srcs = glob.glob(os.path.join(AND, 'java', '**', '*.java'), recursive=True) + \
           glob.glob(os.path.join(B, 'gen', '**', '*.java'), recursive=True)
    os.makedirs(os.path.join(B, 'classes'))
    # (ECJ, o compilador Java do Eclipse: o d8 deste pacote não aceita os .class do javac 21)
    run(['java', '-jar', os.path.join(TOOLS, 'ecj-3.45.0.jar'), '-source', '8', '-target', '8', '-encoding', 'UTF-8', '-nowarn',
         '-bootclasspath', ANDROID_JAR, '-classpath', ANDROID_JAR, '-d', os.path.join(B, 'classes')] + srcs)
    classes = glob.glob(os.path.join(B, 'classes', '**', '*.class'), recursive=True)
    os.makedirs(os.path.join(B, 'dex'))
    run(['java', '-cp', os.path.join(TOOLS, 'd8.jar'), 'com.android.tools.r8.D8',
         '--release', '--min-api', '24', '--lib', ANDROID_JAR, '--output', os.path.join(B, 'dex')] + classes)

    # 5) monta o APK final alinhado (arquivos sem compressão começam em múltiplos de 4 bytes)
    unsigned = os.path.join(B, 'unsigned.apk')
    src = zipfile.ZipFile(os.path.join(B, 'base.apk'))
    with zipfile.ZipFile(unsigned, 'w') as z:
        def add(name, data, stored):
            zi = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
            zi.external_attr = 0o644 << 16
            if stored:
                start = z.fp.tell() + 30 + len(name.encode('utf-8'))
                pad = (-start) % 4
                if pad:
                    # bloco "alinhamento" do Android: cabeçalho (4) + uint16 alinhamento + zeros
                    n = pad
                    while n < 6: n += 4
                    zi.extra = struct.pack('<HHH', 0xD935, n - 4, 4) + b'\0' * (n - 6)
            z.writestr(zi, data, compresslevel=9)
        add('AndroidManifest.xml', src.read('AndroidManifest.xml'), False)
        add('classes.dex', open(os.path.join(B, 'dex', 'classes.dex'), 'rb').read(), False)
        for i in src.infolist():
            if i.filename == 'AndroidManifest.xml' or i.is_dir():
                continue
            add(i.filename, src.read(i.filename), i.compress_type == zipfile.ZIP_STORED)

    # 6) assinatura (apksigner oficial: esquemas v1+v2+v3) e verificação
    signer = os.path.join(TOOLS, 'apksigner.jar')
    run(['java', '-jar', signer, 'sign', '--ks', KS, '--ks-type', 'PKCS12', '--ks-pass', 'pass:' + KS_PASS,
         '--ks-key-alias', 'axogo', '--min-sdk-version', '24', '--out', OUT, unsigned])
    for ext in ('.idsig',):
        if os.path.exists(OUT + ext): os.remove(OUT + ext)
    print(run(['java', '-jar', signer, 'verify', '--verbose', '--min-sdk-version', '24', OUT]).strip())

    # 7) conferência do alinhamento no arquivo final
    bad = []
    with open(OUT, 'rb') as f, zipfile.ZipFile(OUT) as z:
        for i in z.infolist():
            f.seek(i.header_offset + 26); n, m = struct.unpack('<HH', f.read(4))
            start = i.header_offset + 30 + n + m
            if i.compress_type == zipfile.ZIP_STORED and start % 4:
                bad.append(i.filename)
        names = z.namelist()
    print('APK:', OUT, '%.1f MB' % (os.path.getsize(OUT) / 1e6), '| arquivos:', len(names),
          '| desalinhados:', bad or 'nenhum', '| versão', vname, '(%s)' % vcode)
    if bad: sys.exit('alinhamento quebrado')


if __name__ == '__main__':
    main()
