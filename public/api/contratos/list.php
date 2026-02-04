<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('GET');
require_login();

$pdo = pdo();
$contratos = pdo_fetch_all($pdo, 'SELECT * FROM contratos ORDER BY createdAt DESC');

$ids = array_map(fn($c) => (string)$c['id'], $contratos);
$map = [];
foreach ($ids as $id) $map[$id] = [];

if (count($ids) > 0) {
  $placeholders = implode(',', array_fill(0, count($ids), '?'));
  $stmt = $pdo->prepare('SELECT contratoId, pecaId FROM contratos_pecas WHERE contratoId IN (' . $placeholders . ')');
  $stmt->execute($ids);
  while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $cid = (string)$row['contratoId'];
    if (!isset($map[$cid])) $map[$cid] = [];
    $map[$cid][] = (string)$row['pecaId'];
  }
}

$items = array_map(function($c) use ($map) {
  $id = (string)$c['id'];
  $c['pecasIds'] = $map[$id] ?? [];
  return $c;
}, $contratos);

json_response(['ok' => true, 'items' => $items]);
