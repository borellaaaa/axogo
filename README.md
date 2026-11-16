# AxoGo

App fitness no estilo Duolingo, guiado por uma turma de axolotes: treinos em casa,
caminhadas e corridas com GPS, ofensiva diária e recuperação.

## Baixar o app (Android)

**[Baixar AxoGo.apk](https://github.com/borellaaaa/axogo/raw/main/dist/AxoGo.apk)**

Depois de instalado, o app se atualiza sozinho: ele confere `web/manifest.json` ao abrir
e baixa só o que mudou.

## Pastas

| Pasta | O que é |
|---|---|
| `web/` | O app em si (telas, treinos, axolotes 3D). Tudo aqui é atualizado remotamente. |
| `android/` | Casca nativa Android (WebView, GPS em segundo plano, lembretes, atualizador). |
| `supabase/` | Banco (tabelas `progress` e `activities` com RLS) e a função `delete-account`. |
| `tools/make_manifest.py` | Gera `web/manifest.json` com a versão e o SHA-256 de cada arquivo. |
| `tools/build_apk.py` | Compila e assina o APK sem Gradle (aapt2 + ECJ + d8 + apksigner). |
| `dist/AxoGo.apk` | O APK pronto para instalar. |

## Publicar uma atualização

1. Altere os arquivos em `web/`.
2. `python3 tools/make_manifest.py "o que mudou"`
3. Commit e push na `main`. Os apps instalados pegam a nova versão na próxima abertura.

Só é preciso gerar um APK novo quando algo em `android/` muda:
`python3 tools/build_apk.py dist/AxoGo.apk` (requer `pip install aapt2` e `npm i @drxiaozhi/minapk`).

## Conta e nuvem (Supabase)

Projeto Supabase `axogo` (`wrvcyfuatpabzgmcjzul`, São Paulo). Login só com Google, sem e-mail/senha.
No APK o login abre no navegador do celular e volta pro app por `com.axogo.app://auth`.
O app funciona offline e envia o progresso quando há internet.
