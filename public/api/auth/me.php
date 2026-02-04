<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('GET');

$u = current_user();
if (!$u) {
  json_response(['ok' => true, 'user' => null]);
}

// Atualiza foto/nome do banco (caso mude)
$pdo = pdo();
$row = pdo_fetch_one($pdo, 'SELECT id, nome, perfil, login, foto, cargo, cpf FROM funcionarios WHERE id = :id', [':id' => (string)$u['id']]);
if ($row) {
  $_SESSION['user'] = $row;
  json_response(['ok' => true, 'user' => $row]);
}

json_response(['ok' => true, 'user' => $u]);
