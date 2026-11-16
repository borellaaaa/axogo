# Chave de TESTE

`axogo-teste.jks` (senha `axogoteste`) é uma chave de assinatura **pública, só para testes**.
Ela existe para que todo APK compilado aqui tenha a mesma assinatura e possa ser instalado
por cima do anterior.

Antes de distribuir o app para outras pessoas ou publicar na Play Store, gere uma chave
privada e cadastre nos *secrets* do repositório (Settings → Secrets and variables → Actions):

- `AXO_KEYSTORE_B64`: o arquivo .jks em base64
- `AXO_KEYSTORE_PASS`: a senha (alias `axogo`)

Com os secrets cadastrados, o build passa a usar a chave privada automaticamente.
(Trocar de chave exige desinstalar o app antigo uma vez.)
