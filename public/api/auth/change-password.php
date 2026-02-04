<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('POST');
$u = require_login();
$data = read_json_body();

$current = (string)($data['currentPassword'] ?? '');
$new = (string)($data['newPassword'] ?? '');
if (strlen($new) < 6) json_response(['ok' => false, 'error' => 'A nova senha deve ter pelo menos 6 caracteres'], 400);

$pdo = pdo();
$row = pdo_fetch_one($pdo, 'SELECT id, senha FROM funcionarios WHERE id = :id', [':id' => (string)$u['id']]);
if (!$row) json_response(['ok' => false, 'error' => 'Usuário não encontrado'], 404);

$stored = (string)($row['senha'] ?? '');
$ok = false;
if (str_starts_with($stored, '$2y$') || str_starts_with($stored, '$2a$') || str_starts_with($stored, '$argon2')) {
  $ok = password_verify($current, $stored);
} else {
  $ok = hash_equals($stored, $current);
}
if (!$ok) json_response(['ok' => false, 'error' => 'Senha atual incorreta'], 400);

$hash = password_hash($new, PASSWORD_DEFAULT);
pdo_execute($pdo, 'UPDATE funcionarios SET senha = :senha, updatedAt = UTC_TIMESTAMP() WHERE id = :id', [':senha' => $hash, ':id' => (string)$u['id']]);

json_response(['ok' => true]);
