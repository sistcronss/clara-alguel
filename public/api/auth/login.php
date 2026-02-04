<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('POST');
$data = read_json_body();

$login = trim((string)($data['login'] ?? ''));
$senha = (string)($data['senha'] ?? '');

if ($login === '' || $senha === '') {
  json_response(['ok' => false, 'error' => 'Informe login e senha'], 400);
}

$pdo = pdo();
$user = pdo_fetch_one($pdo, 'SELECT id, nome, perfil, login, senha, foto, cargo, cpf FROM funcionarios WHERE LOWER(login) = LOWER(:login) LIMIT 1', [':login' => $login]);
if (!$user) json_response(['ok' => false, 'error' => 'Usuário ou senha inválidos'], 401);

$stored = (string)($user['senha'] ?? '');
$ok = false;
if (str_starts_with($stored, '$2y$') || str_starts_with($stored, '$2a$') || str_starts_with($stored, '$argon2')) {
  $ok = password_verify($senha, $stored);
} else {
  // compatibilidade com seed antigo em texto puro
  $ok = hash_equals($stored, $senha);
  // upgrade para hash
  if ($ok) {
    $hash = password_hash($senha, PASSWORD_DEFAULT);
    try {
      pdo_execute($pdo, 'UPDATE funcionarios SET senha = :senha, updatedAt = UTC_TIMESTAMP() WHERE id = :id', [':senha' => $hash, ':id' => $user['id']]);
      $user['senha'] = $hash;
    } catch (Throwable) {
    }
  }
}

if (!$ok) json_response(['ok' => false, 'error' => 'Usuário ou senha inválidos'], 401);

session_regenerate_id(true);

$sessionUser = [
  'id' => $user['id'],
  'nome' => $user['nome'],
  'perfil' => $user['perfil'],
  'login' => $user['login'],
  'foto' => $user['foto'],
  'cargo' => $user['cargo'],
  'cpf' => $user['cpf'],
];

$_SESSION['user'] = $sessionUser;

json_response(['ok' => true, 'user' => $sessionUser]);
