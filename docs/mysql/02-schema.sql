-- 02-schema.sql
-- Esquema MySQL para "Sistema Alocação de Trajes Finos" (API PHP + MySQL)

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Use o banco (ajuste se necessário)
USE `u266668298_claraalquel`;

-- EMPRESA (configuração)
CREATE TABLE IF NOT EXISTS empresa (
  -- a API usa por padrão o id "empresa-1"
  id            VARCHAR(50) PRIMARY KEY,
  nome          VARCHAR(160) NULL,
  cnpj          VARCHAR(25) NULL,
  logo          MEDIUMTEXT NULL,
  telefone      VARCHAR(25) NULL,
  whatsapp      VARCHAR(25) NULL,
  email         VARCHAR(160) NULL,
  endereco      VARCHAR(255) NULL,
  createdAt     DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  updatedAt     DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USUÁRIOS / FUNCIONÁRIOS
CREATE TABLE IF NOT EXISTS funcionarios (
  id            VARCHAR(36) PRIMARY KEY,
  nome          VARCHAR(160) NOT NULL,
  cpf           VARCHAR(25) NULL,
  cargo         VARCHAR(80) NULL,
  perfil        ENUM('Administrador','Funcionario') NOT NULL DEFAULT 'Funcionario',
  login         VARCHAR(60) NOT NULL,
  senha         VARCHAR(255) NOT NULL,
  foto          MEDIUMTEXT NULL,
  createdAt     DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  updatedAt     DATETIME NULL,
  UNIQUE KEY uk_funcionarios_login (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id            VARCHAR(36) PRIMARY KEY,
  nome          VARCHAR(160) NOT NULL,
  -- guarda CPF ou CNPJ
  cpf           VARCHAR(25) NOT NULL,
  nascimento    DATE NULL,
  telefone      VARCHAR(25) NULL,
  endereco      VARCHAR(255) NULL,
  cep           VARCHAR(15) NULL,
  createdAt     DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  updatedAt     DATETIME NULL,
  UNIQUE KEY uk_clientes_cpf (cpf)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PEÇAS
CREATE TABLE IF NOT EXISTS pecas (
  id            VARCHAR(36) PRIMARY KEY,
  codigo        VARCHAR(50) NOT NULL,
  tipo          VARCHAR(80) NOT NULL,
  descricao     TEXT NULL,
  tamanho       VARCHAR(40) NULL,
  cor           VARCHAR(40) NULL,
  valorAluguel  DECIMAL(10,2) NULL,
  -- status base: Disponível / Manutenção / Inativa ("Alugada" é calculado por contrato Ativo)
  status        ENUM('Disponivel','Manutencao','Inativa') NOT NULL DEFAULT 'Disponivel',
  observacoes   TEXT NULL,
  createdAt     DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  updatedAt     DATETIME NULL,
  UNIQUE KEY uk_pecas_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CONTRATOS
CREATE TABLE IF NOT EXISTS contratos (
  id            VARCHAR(36) PRIMARY KEY,
  codigo        VARCHAR(50) NULL,
  clienteId     VARCHAR(36) NOT NULL,
  evento        VARCHAR(255) NULL,
  dataEvento    DATE NULL,
  retirada      DATE NULL,
  devolucao     DATE NULL,
  desconto      DECIMAL(10,2) NULL,
  status        ENUM('Pendente','Ativo','Finalizado','Cancelado') NOT NULL DEFAULT 'Pendente',
  observacoes   TEXT NULL,
  createdAt     DATETIME NOT NULL DEFAULT UTC_TIMESTAMP(),
  updatedAt     DATETIME NULL,
  KEY idx_contratos_clienteId (clienteId),
  UNIQUE KEY uk_contratos_codigo (codigo),
  CONSTRAINT fk_contratos_cliente FOREIGN KEY (clienteId) REFERENCES clientes(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ITENS DO CONTRATO (N:N contratos x peças)
CREATE TABLE IF NOT EXISTS contratos_pecas (
  contratoId    VARCHAR(36) NOT NULL,
  pecaId        VARCHAR(36) NOT NULL,
  PRIMARY KEY (contratoId, pecaId),
  KEY idx_contratos_pecas_pecaId (pecaId),
  CONSTRAINT fk_cp_contrato FOREIGN KEY (contratoId) REFERENCES contratos(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_cp_peca FOREIGN KEY (pecaId) REFERENCES pecas(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seeds opcionais (para testar login)
-- A API aceita senha em texto puro e faz upgrade para hash no primeiro login,
-- mas o recomendado é inserir já com hash.
-- Gere um hash localmente (no seu PC):
--   php -r "echo password_hash('123456', PASSWORD_DEFAULT), PHP_EOL;"
-- E substitua abaixo.
--
-- INSERT IGNORE INTO funcionarios (id, nome, cpf, cargo, perfil, login, senha, foto)
-- VALUES
--   ('seed-f-2', 'Carlos Souza', '555.666.777-88', 'Gerente', 'Administrador', 'carlos', 'COLE_AQUI_O_HASH', NULL),
--   ('seed-f-1', 'Ana Lima', '111.222.333-44', 'Atendente', 'Funcionario', 'ana', 'COLE_AQUI_O_HASH', NULL);

-- Exemplo de hash já gerado para senha "123456" (opcional):
-- $2y$12$zGddMmgxhtGpr1Vq9wbxp.uLQX.rFEgDbrKXTGlnd7MTQ6MLl/.Lu
