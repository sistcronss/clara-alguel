<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('GET');
require_admin();

$pdo = pdo();
$items = pdo_fetch_all($pdo, 'SELECT id, nome, cpf, cargo, perfil, login, foto, createdAt, updatedAt FROM funcionarios ORDER BY createdAt DESC');
json_response(['ok' => true, 'items' => $items]);
