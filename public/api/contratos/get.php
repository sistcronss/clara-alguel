<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('GET');
require_login();

$id = isset($_GET['id']) ? trim((string)$_GET['id']) : '';
if ($id === '') json_response(['ok' => false, 'error' => 'id é obrigatório'], 400);

$pdo = pdo();
$item = pdo_fetch_one($pdo, 'SELECT * FROM contratos WHERE id = :id', [':id' => $id]);
if (!$item) json_response(['ok' => false, 'error' => 'Contrato não encontrado'], 404);

$rows = pdo_fetch_all($pdo, 'SELECT pecaId FROM contratos_pecas WHERE contratoId = :id', [':id' => $id]);
$item['pecasIds'] = array_map(fn($r) => (string)$r['pecaId'], $rows);

json_response(['ok' => true, 'item' => $item]);
