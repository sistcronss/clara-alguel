<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('GET');
require_login();

$pdo = pdo();
// Extrai o maior número do padrão CT-00001
$row = pdo_fetch_one($pdo, "SELECT MAX(CAST(SUBSTRING(codigo, 4) AS UNSIGNED)) AS maxn FROM contratos WHERE codigo LIKE 'CT-%'");
$max = (int)($row['maxn'] ?? 0);
$next = 'CT-' . str_pad((string)($max + 1), 5, '0', STR_PAD_LEFT);

json_response(['ok' => true, 'codigo' => $next]);
