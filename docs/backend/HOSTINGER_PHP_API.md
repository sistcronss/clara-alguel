# API PHP (Hostinger) + MySQL localhost

Isso cria uma API simples em PHP (compatível com hospedagem compartilhada da Hostinger) para conectar no seu MySQL (`localhost`).

## Arquivos criados
- `public/api/_config.php.example` (você copia para `_config.php` e coloca a senha)
- `public/api/health.php` (teste da API + DB)
- `public/api/funcionarios/upload-avatar.php` (upload de foto e salva URL no MySQL)
- `public/uploads/avatars/` (onde as fotos ficam)

Endpoints adicionais (CRUD + auth):
- `public/api/auth/login.php`, `me.php`, `logout.php`, `change-password.php`
- `public/api/clientes/*` (list/get/create/update/delete)
- `public/api/pecas/*` (list/get/create/update/delete)
- `public/api/contratos/*` (list/get/create/update/delete + next-codigo)
- `public/api/empresa/get.php`, `public/api/empresa/save.php`

## Passo a passo no Hostinger
1. Faça upload do seu site (da pasta `dist/`) para o `public_html`.
2. **Depois do upload**, crie no servidor o arquivo:
   - `public_html/api/_config.php`
   copiando o conteúdo de `public/api/_config.php.example` e preenchendo a senha.

3. (Recomendado) Garanta que `public_html/uploads/avatars/` exista e esteja gravável.

### Teste 1: saúde da API
Acesse no navegador:
- `https://SEU-DOMINIO/api/health.php`

Deve retornar JSON com `ok: true`.

### Teste 2: login (sessão)
O sistema agora autentica via **cookie de sessão PHP** (não usa localStorage para sessão no modo API).

Faça um POST JSON em:
- `https://SEU-DOMINIO/api/auth/login.php`

Body:
```json
{ "login": "carlos", "senha": "123456" }
```

Depois acesse:
- `https://SEU-DOMINIO/api/auth/me.php`

Deve retornar `user` preenchido.

### Teste 2: upload de avatar
Endpoint:
- `POST https://SEU-DOMINIO/api/funcionarios/upload-avatar.php`

Form-data:
- `userId`: id do funcionário (ex: `seed-f-2`)
- `file`: imagem

Retorno:
- `{ ok: true, url: "https://.../uploads/avatars/avatar-...jpg" }`

## Observação (importante)
No modo API (Hostinger), o frontend lê/grava via `/api/*` usando MySQL.

Para ativar no build do Vite:
- crie um `.env` baseado no `.env.example` e deixe `VITE_USE_API=1`.
