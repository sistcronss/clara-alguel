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
  pdo_execute($pdo, 'DELETE FROM pecas WHERE id = :id', [':id' => $id]);
} catch (PDOException $e) {
  // fk_cp_peca (RESTRICT)
  json_response(['ok' => false, 'error' => 'Não foi possível excluir (peça vinculada a contrato)', 'detail' => $e->getMessage()], 409);
}

json_response(['ok' => true]);
