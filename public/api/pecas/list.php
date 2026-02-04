<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('GET');
require_login();

$pdo = pdo();
$items = pdo_fetch_all($pdo, 'SELECT * FROM pecas ORDER BY createdAt DESC');
json_response(['ok' => true, 'items' => $items]);
