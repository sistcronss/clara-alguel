-- 01-create-db-and-user.sql
-- Hostinger (MySQL) - criação de banco e usuário
--
-- IMPORTANTE:
-- 1) Em hospedagens compartilhadas, às vezes o usuário/banco já é criado pelo hPanel.
--    Se este script der erro em CREATE USER/GRANT, use apenas o 02-schema.sql.
-- 2) Ajuste os nomes/usuário conforme seu prefixo do Hostinger.
--
-- Preencha (confirme no hPanel):
--   DATABASE_NAME = u266668298_claraalquel
--   DB_USERNAME   = u266668298_claraalquel
--   DB_PASSWORD   = COLE_A_SENHA_AQUI
--
-- Dica: execute no phpMyAdmin como o usuário principal (se houver).

-- Cria o banco
CREATE DATABASE IF NOT EXISTS `u266668298_claraalquel`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- Cria usuário (pode falhar se Hostinger não permitir via SQL)
-- Troque % por localhost se o host exigir.
CREATE USER IF NOT EXISTS 'u266668298_claraalquel'@'%' IDENTIFIED BY 'COLE_A_SENHA_AQUI';

-- Permissões
GRANT ALL PRIVILEGES ON `u266668298_claraalquel`.* TO 'u266668298_claraalquel'@'%';
FLUSH PRIVILEGES;
