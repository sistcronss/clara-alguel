<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('POST');
require_admin();
$data = read_json_body();

$id = trim((string)($data['id'] ?? ''));
if ($id === '') json_response(['ok' => false, 'error' => 'id é obrigatório'], 400);

$pdo = pdo();
try {
  pdo_execute($pdo, 'DELETE FROM funcionarios WHERE id = :id', [':id' => $id]);
} catch (Throwable $e) {
  json_response(['ok' => false, 'error' => 'Erro ao excluir usuário', 'detail' => $e->getMessage()], 500);
}

json_response(['ok' => true]);
