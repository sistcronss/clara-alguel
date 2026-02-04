<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('GET');
require_login();

$pdo = pdo();
$item = pdo_fetch_one($pdo, 'SELECT * FROM empresa LIMIT 1');

json_response(['ok' => true, 'item' => $item]);
