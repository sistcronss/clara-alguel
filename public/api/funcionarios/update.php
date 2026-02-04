<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('POST');
$me = require_login();
$data = read_json_body();

$id = trim((string)($data['id'] ?? ''));
if ($id === '') json_response(['ok' => false, 'error' => 'id é obrigatório'], 400);

$isAdmin = ((string)($me['perfil'] ?? '') === 'Administrador');
if (!$isAdmin && (string)($me['id'] ?? '') !== $id) {
  json_response(['ok' => false, 'error' => 'Acesso restrito'], 403);
}

$nome = trim((string)($data['nome'] ?? ''));
$cpf = trim((string)($data['cpf'] ?? ''));
$cargo = trim((string)($data['cargo'] ?? ''));
$perfil = trim((string)($data['perfil'] ?? ''));
$login = trim((string)($data['login'] ?? ''));
$foto = (string)($data['foto'] ?? null);
$senha = (string)($data['senha'] ?? '');

$pdo = pdo();
$exists = pdo_fetch_one($pdo, 'SELECT id FROM funcionarios WHERE id = :id', [':id' => $id]);
if (!$exists) json_response(['ok' => false, 'error' => 'Usuário não encontrado'], 404);

// Para não quebrar o formulário atual, exigimos os campos base.
if ($nome === '') json_response(['ok' => false, 'error' => 'nome é obrigatório'], 400);
if ($login === '') json_response(['ok' => false, 'error' => 'login é obrigatório'], 400);

if (!$isAdmin) {
  // funcionário comum não muda perfil
  $perfil = '';
}

$setSenha = false;
$senhaHash = null;
if ($senha !== '') {
  if (strlen($senha) < 6) json_response(['ok' => false, 'error' => 'senha inválida (mín 6)'], 400);
  $setSenha = true;
  $senhaHash = password_hash($senha, PASSWORD_DEFAULT);
}

try {
  if ($isAdmin && $perfil !== '') {
    if ($perfil !== 'Administrador' && $perfil !== 'Funcionario') $perfil = 'Funcionario';
  }

  $sql = 'UPDATE funcionarios SET nome=:nome, cpf=:cpf, cargo=:cargo, login=:login, foto=:foto, updatedAt=UTC_TIMESTAMP()';
  $params = [
    ':id' => $id,
    ':nome' => $nome,
    ':cpf' => ($cpf !== '' ? $cpf : null),
    ':cargo' => ($cargo !== '' ? $cargo : null),
    ':login' => $login,
    ':foto' => ($foto !== '' ? $foto : null),
  ];

  if ($isAdmin && $perfil !== '') {
    $sql .= ', perfil=:perfil';
    $params[':perfil'] = $perfil;
  }

  if ($setSenha) {
    $sql .= ', senha=:senha';
    $params[':senha'] = $senhaHash;
  }

  $sql .= ' WHERE id=:id';

  pdo_execute($pdo, $sql, $params);
} catch (PDOException $e) {
  if (str_contains($e->getMessage(), 'uk_funcionarios_login')) {
    json_response(['ok' => false, 'error' => 'Login já cadastrado'], 409);
  }
  json_response(['ok' => false, 'error' => 'Erro ao atualizar usuário', 'detail' => $e->getMessage()], 500);
}

$item = pdo_fetch_one($pdo, 'SELECT id, nome, cpf, cargo, perfil, login, foto, createdAt, updatedAt FROM funcionarios WHERE id = :id', [':id' => $id]);
// se atualizou o próprio usuário, atualiza sessão
if ((string)($me['id'] ?? '') === $id) {
  $_SESSION['user'] = [
    'id' => $item['id'],
    'nome' => $item['nome'],
    'perfil' => $item['perfil'],
    'login' => $item['login'],
    'foto' => $item['foto'],
    'cargo' => $item['cargo'],
    'cpf' => $item['cpf'],
  ];
}

json_response(['ok' => true, 'item' => $item]);
