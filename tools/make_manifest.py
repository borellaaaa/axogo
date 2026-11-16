#!/usr/bin/env python3
"""Gera web/manifest.json: a lista de arquivos (com SHA-256) que o app instalado
usa para se atualizar sozinho. Rode antes de cada commit que mexe em /web.

  python3 tools/make_manifest.py "o que mudou nesta versão"

A versão sobe em +1 sempre que algum arquivo muda.
"""
import hashlib, json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web')
OUT = os.path.join(ROOT, 'manifest.json')

def main():
    files = []
    for base, dirs, names in os.walk(ROOT):
        dirs.sort()
        for n in sorted(names):
            p = os.path.join(base, n)
            rel = os.path.relpath(p, ROOT).replace(os.sep, '/')
            if rel == 'manifest.json' or n.startswith('.'):
                continue
            data = open(p, 'rb').read()
            files.append({'path': rel, 'sha256': hashlib.sha256(data).hexdigest(), 'size': len(data)})
    old = {}
    if os.path.exists(OUT):
        old = json.load(open(OUT, encoding='utf-8'))
    notes = sys.argv[1] if len(sys.argv) > 1 else old.get('notes', '')
    version = old.get('version', 0)
    if old.get('files') != files:
        version += 1
    man = {'version': version, 'minShell': old.get('minShell', 1), 'notes': notes, 'files': files}
    json.dump(man, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('manifest v%d, %d arquivos, %.0f KB' % (version, len(files), sum(f['size'] for f in files) / 1024))

if __name__ == '__main__':
    main()
