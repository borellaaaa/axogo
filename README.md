# AxoGo

App fitness no estilo Duolingo, guiado por uma turma de axolotes: treinos em casa,
caminhadas e corridas com GPS, ofensiva diária e recuperação.

## Baixar o app (Android)

**[Baixar AxoGo.apk](https://github.com/borellaaaa/axogo/releases/download/apk/AxoGo.apk)**

Depois de instalado, o app se atualiza sozinho: ele confere `web/manifest.json` ao abrir
e baixa só o que mudou.

## Pastas

| Pasta | O que é |
|---|---|
| `web/` | O app em si (telas, treinos, axolotes 3D). Tudo aqui é atualizado remotamente. |
| `android/` | Casca nativa Android (WebView, GPS em segundo plano, lembretes, atualizador). |
| `tools/make_manifest.py` | Gera `web/manifest.json` com a versão e o SHA-256 de cada arquivo. |
| `.github/workflows/build-apk.yml` | Compila o APK e publica na release `apk`. |

## Publicar uma atualização

1. Altere os arquivos em `web/`.
2. `python3 tools/make_manifest.py "o que mudou"`
3. Commit e push na `main`. Os apps instalados pegam a nova versão na próxima abertura.

Só é preciso gerar um APK novo quando algo em `android/` muda.
