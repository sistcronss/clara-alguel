-- 02-schema.sql
-- Esquema MySQL para "Sistema Alocação de Trajes Finos"
--
-- Observação: o projeto atual é frontend (localStorage). Este schema serve
-- como base para quando você criar um backend/API.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Use o banco (ajuste se necessário)
USE `u266668298_claraalquel`;

-- EMPRESA (configuração)
CREATE TABLE IF NOT EXISTS empresa (
  id            VARCHAR(36) PRIMARY KEY,
  nome          VARCHAR(255) NULL,
  logo          LONGTEXT NULL,
  telefone      VARCHAR(50) NULL,
  endereco      VARCHAR(255) NULL,
  createdAt     DATETIME NULL,
  updatedAt     DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USUÁRIOS / FUNCIONÁRIOS
CREATE TABLE IF NOT EXISTS funcionarios (
  id            VARCHAR(36) PRIMARY KEY,
  nome          VARCHAR(255) NOT NULL,
  cpf           VARCHAR(20) NULL,
  cargo         VARCHAR(100) NULL,
  perfil        ENUM('Administrador','Funcionario') NOT NULL DEFAULT 'Funcionario',
  login         VARCHAR(50) NOT NULL,
  senha         VARCHAR(255) NOT NULL,
  foto          LONGTEXT NULL,
  createdAt     DATETIME NULL,
  updatedAt     DATETIME NULL,
  UNIQUE KEY uk_funcionarios_login (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id            VARCHAR(36) PRIMARY KEY,
  nome          VARCHAR(255) NOT NULL,
  cpf           VARCHAR(20) NOT NULL,
  nascimento    DATE NULL,
  telefone      VARCHAR(50) NULL,
  endereco      VARCHAR(255) NULL,
  cep           VARCHAR(20) NULL,
  createdAt     DATETIME NULL,
  updatedAt     DATETIME NULL,
  UNIQUE KEY uk_clientes_cpf (cpf)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PEÇAS
CREATE TABLE IF NOT EXISTS pecas (
  id            VARCHAR(36) PRIMARY KEY,
  codigo        VARCHAR(50) NOT NULL,
  tipo          VARCHAR(50) NOT NULL,
  descricao     VARCHAR(255) NULL,
  tamanho       VARCHAR(20) NULL,
  cor           VARCHAR(50) NULL,
  valorAluguel  DECIMAL(10,2) NULL,
  -- status base: Disponível / Manutenção / Inativa ("Alugada" é calculado por contrato Ativo)
  status        ENUM('Disponivel','Manutencao','Inativa') NOT NULL DEFAULT 'Disponivel',
  observacoes   TEXT NULL,
  createdAt     DATETIME NULL,
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
  createdAt     DATETIME NULL,
  updatedAt     DATETIME NULL,
  KEY idx_contratos_clienteId (clienteId),
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
INSERT IGNORE INTO funcionarios (id, nome, cpf, cargo, perfil, login, senha, foto, createdAt)
VALUES
  ('seed-f-2', 'Carlos Souza', '555.666.777-88', 'Gerente', 'Administrador', 'carlos', '123456', NULL, NOW()),
  ('seed-f-1', 'Ana Lima', '111.222.333-44', 'Atendente', 'Funcionario', 'ana', '123456', NULL, NOW());
