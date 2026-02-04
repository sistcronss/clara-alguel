<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('GET');
require_login();

$id = isset($_GET['id']) ? trim((string)$_GET['id']) : '';
if ($id === '') json_response(['ok' => false, 'error' => 'id é obrigatório'], 400);

$pdo = pdo();
$item = pdo_fetch_one($pdo, 'SELECT * FROM pecas WHERE id = :id', [':id' => $id]);
if (!$item) json_response(['ok' => false, 'error' => 'Peça não encontrada'], 404);

json_response(['ok' => true, 'item' => $item]);
