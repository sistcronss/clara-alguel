# API PHP (Hostinger) + MySQL localhost

Isso cria uma API simples em PHP (compatível com hospedagem compartilhada da Hostinger) para conectar no seu MySQL (`localhost`).

## Arquivos criados
- `public/api/_config.php.example` (você copia para `_config.php` e coloca a senha)
- `public/api/health.php` (teste da API + DB)
- `public/api/funcionarios/upload-avatar.php` (upload de foto e salva URL no MySQL)
- `public/uploads/avatars/` (onde as fotos ficam)

## Passo a passo no Hostinger
1. Faça upload do seu site (da pasta `dist/`) para o `public_html`.
2. **Depois do upload**, crie no servidor o arquivo:
   - `public_html/api/_config.php`
   copiando o conteúdo de `public/api/_config.php.example` e preenchendo a senha.

### Teste 1: saúde da API
Acesse no navegador:
- `https://SEU-DOMINIO/api/health.php`

Deve retornar JSON com `ok: true`.

### Teste 2: upload de avatar
Endpoint:
- `POST https://SEU-DOMINIO/api/funcionarios/upload-avatar.php`

Form-data:
- `userId`: id do funcionário (ex: `seed-f-2`)
- `file`: imagem

Retorno:
- `{ ok: true, url: "https://.../uploads/avatars/avatar-...jpg" }`

## Observação (importante)
Seu frontend hoje salva quase tudo em `localStorage`. Para usar o MySQL de verdade, o próximo passo é:
- criar endpoints CRUD (clientes/peças/contratos)
- mudar o React para ler/gravar via API

Se você quiser, eu prossigo criando os endpoints CRUD e a integração no React.
