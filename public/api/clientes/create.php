<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('POST');
$u = require_login();
$data = read_json_body();

$nome = trim((string)($data['nome'] ?? ''));
$cpf = trim((string)($data['cpf'] ?? ''));
$nascimento = trim((string)($data['nascimento'] ?? ''));
$telefone = trim((string)($data['telefone'] ?? ''));
$endereco = trim((string)($data['endereco'] ?? ''));
$cep = trim((string)($data['cep'] ?? ''));

if ($nome === '') json_response(['ok' => false, 'error' => 'nome é obrigatório'], 400);
if ($cpf === '') json_response(['ok' => false, 'error' => 'cpf é obrigatório'], 400);

$id = trim((string)($data['id'] ?? ''));
if ($id === '') $id = new_id();

$pdo = pdo();
try {
  pdo_execute($pdo,
    'INSERT INTO clientes (id, nome, cpf, nascimento, telefone, endereco, cep, createdAt, updatedAt) VALUES (:id,:nome,:cpf,:nascimento,:telefone,:endereco,:cep,UTC_TIMESTAMP(),NULL)',
    [
      ':id' => $id,
      ':nome' => $nome,
      ':cpf' => $cpf,
      ':nascimento' => ($nascimento !== '' ? $nascimento : null),
      ':telefone' => ($telefone !== '' ? $telefone : null),
      ':endereco' => ($endereco !== '' ? $endereco : null),
      ':cep' => ($cep !== '' ? $cep : null),
    ]
  );
} catch (PDOException $e) {
  if (str_contains($e->getMessage(), 'uk_clientes_cpf')) {
    json_response(['ok' => false, 'error' => 'CPF já cadastrado'], 409);
  }
  json_response(['ok' => false, 'error' => 'Erro ao criar cliente', 'detail' => $e->getMessage()], 500);
}

$item = pdo_fetch_one($pdo, 'SELECT * FROM clientes WHERE id = :id', [':id' => $id]);
json_response(['ok' => true, 'item' => $item]);
