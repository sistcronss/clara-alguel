<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('POST');
require_admin();
$data = read_json_body();

$id = trim((string)($data['id'] ?? ''));
if ($id === '') $id = new_id();

$nome = trim((string)($data['nome'] ?? ''));
$cpf = trim((string)($data['cpf'] ?? ''));
$cargo = trim((string)($data['cargo'] ?? ''));
$perfil = trim((string)($data['perfil'] ?? 'Funcionario'));
$login = trim((string)($data['login'] ?? ''));
$senha = (string)($data['senha'] ?? '');
$foto = (string)($data['foto'] ?? null);

if ($nome === '') json_response(['ok' => false, 'error' => 'nome é obrigatório'], 400);
if ($login === '') json_response(['ok' => false, 'error' => 'login é obrigatório'], 400);
if ($senha === '' || strlen($senha) < 6) json_response(['ok' => false, 'error' => 'senha inválida (mín 6)'], 400);

if ($perfil !== 'Administrador' && $perfil !== 'Funcionario') $perfil = 'Funcionario';

$hash = password_hash($senha, PASSWORD_DEFAULT);

$pdo = pdo();
try {
  pdo_execute($pdo,
    'INSERT INTO funcionarios (id, nome, cpf, cargo, perfil, login, senha, foto, createdAt, updatedAt) VALUES (:id,:nome,:cpf,:cargo,:perfil,:login,:senha,:foto,UTC_TIMESTAMP(),NULL)',
    [
      ':id' => $id,
      ':nome' => $nome,
      ':cpf' => ($cpf !== '' ? $cpf : null),
      ':cargo' => ($cargo !== '' ? $cargo : null),
      ':perfil' => $perfil,
      ':login' => $login,
      ':senha' => $hash,
      ':foto' => ($foto !== '' ? $foto : null),
    ]
  );
} catch (PDOException $e) {
  if (str_contains($e->getMessage(), 'uk_funcionarios_login')) {
    json_response(['ok' => false, 'error' => 'Login já cadastrado'], 409);
  }
  json_response(['ok' => false, 'error' => 'Erro ao criar usuário', 'detail' => $e->getMessage()], 500);
}

$item = pdo_fetch_one($pdo, 'SELECT id, nome, cpf, cargo, perfil, login, foto, createdAt, updatedAt FROM funcionarios WHERE id = :id', [':id' => $id]);
json_response(['ok' => true, 'item' => $item]);
