<?php
declare(strict_types=1);
require __DIR__ . '/_boot.php';

$pdo = pdo();
$pdo->query('SELECT 1');

json_response([
  'ok' => true,
  'service' => 'api',
  'db' => 'ok',
  'time' => gmdate('c'),
]);
