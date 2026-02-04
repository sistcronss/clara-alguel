# MySQL (Hostinger) – Como criar e executar

## O que eu consigo fazer daqui
Eu não consigo **criar o banco diretamente no seu Hostinger** (não tenho acesso ao seu painel). Mas eu já deixei os **scripts prontos** para você executar no phpMyAdmin.

Arquivos:
- `docs/mysql/01-create-db-and-user.sql` (opcional)
- `docs/mysql/02-schema.sql` (tabelas do sistema)

## 1) Criar banco/usuário no Hostinger (hPanel)
1. hPanel → **Bancos de Dados → MySQL**
2. Crie:
   - Banco: `u266668298_claraalquel`
   - Usuário: `u266668298_claraalquel`
   - Senha: (a que você escolheu)

> Em muitos planos, o Hostinger já cria e vincula usuário ↔ banco pelo painel. Nesse caso, você NÃO precisa executar o `01-create-db-and-user.sql`.

## 2) Executar o schema no phpMyAdmin
1. hPanel → **phpMyAdmin**
2. Selecione o banco `u266668298_claraalquel`
3. Vá em **Importar**
4. Selecione o arquivo `docs/mysql/02-schema.sql`
5. Clique em **Executar**

## 3) Se der erro de permissão
- Ignore o arquivo `01-create-db-and-user.sql`
- Crie usuário/banco pelo hPanel
- Execute apenas o `02-schema.sql`

## 4) Observação importante (sobre seu projeto)
O projeto já tem uma **API em PHP** em `public/api/` e o frontend pode rodar em **modo API** (`VITE_USE_API=1`).

Então, para funcionar em produção com persistência real na Hostinger, você precisa:
- criar o banco MySQL
- importar o `02-schema.sql`
- configurar `public/api/_config.php`
