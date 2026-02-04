<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('POST');
require_login();
$data = read_json_body();

$id = trim((string)($data['id'] ?? ''));
if ($id === '') json_response(['ok' => false, 'error' => 'id é obrigatório'], 400);

$clienteId = trim((string)($data['clienteId'] ?? ''));
if ($clienteId === '') json_response(['ok' => false, 'error' => 'clienteId é obrigatório'], 400);

$codigo = trim((string)($data['codigo'] ?? ''));
$evento = trim((string)($data['evento'] ?? ''));
$dataEvento = trim((string)($data['dataEvento'] ?? ''));
$retirada = trim((string)($data['retirada'] ?? ''));
$devolucao = trim((string)($data['devolucao'] ?? ''));
$descontoRaw = trim((string)($data['desconto'] ?? ''));
$status = trim((string)($data['status'] ?? 'Pendente'));
$observacoes = trim((string)($data['observacoes'] ?? ''));
$pecasIds = $data['pecasIds'] ?? [];
if (!is_array($pecasIds)) $pecasIds = [];

$allowedStatus = ['Pendente','Ativo','Finalizado','Cancelado'];
if (!in_array($status, $allowedStatus, true)) $status = 'Pendente';

$desconto = null;
if ($descontoRaw !== '') {
  $n = (float)str_replace(',', '.', $descontoRaw);
  if (!is_finite($n) || $n < 0) json_response(['ok' => false, 'error' => 'desconto inválido'], 400);
  $desconto = $n;
}

$pdo = pdo();
$exists = pdo_fetch_one($pdo, 'SELECT id FROM contratos WHERE id = :id', [':id' => $id]);
if (!$exists) json_response(['ok' => false, 'error' => 'Contrato não encontrado'], 404);

try {
  $pdo->beginTransaction();

  pdo_execute($pdo,
    'UPDATE contratos SET codigo=:codigo, clienteId=:clienteId, evento=:evento, dataEvento=:dataEvento, retirada=:retirada, devolucao=:devolucao, desconto=:desconto, status=:status, observacoes=:obs, updatedAt=UTC_TIMESTAMP() WHERE id=:id',
    [
      ':id' => $id,
      ':codigo' => ($codigo !== '' ? $codigo : null),
      ':clienteId' => $clienteId,
      ':evento' => ($evento !== '' ? $evento : null),
      ':dataEvento' => ($dataEvento !== '' ? $dataEvento : null),
      ':retirada' => ($retirada !== '' ? $retirada : null),
      ':devolucao' => ($devolucao !== '' ? $devolucao : null),
      ':desconto' => $desconto,
      ':status' => $status,
      ':obs' => ($observacoes !== '' ? $observacoes : null),
    ]
  );

  pdo_execute($pdo, 'DELETE FROM contratos_pecas WHERE contratoId = :id', [':id' => $id]);
  if (count($pecasIds) > 0) {
    $stmt = $pdo->prepare('INSERT INTO contratos_pecas (contratoId, pecaId) VALUES (:cid, :pid)');
    foreach ($pecasIds as $pid) {
      $pid = trim((string)$pid);
      if ($pid === '') continue;
      $stmt->execute([':cid' => $id, ':pid' => $pid]);
    }
  }

  $pdo->commit();
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_response(['ok' => false, 'error' => 'Erro ao atualizar contrato', 'detail' => $e->getMessage()], 500);
}

$item = pdo_fetch_one($pdo, 'SELECT * FROM contratos WHERE id = :id', [':id' => $id]);
$rows = pdo_fetch_all($pdo, 'SELECT pecaId FROM contratos_pecas WHERE contratoId = :id', [':id' => $id]);
$item['pecasIds'] = array_map(fn($r) => (string)$r['pecaId'], $rows);

json_response(['ok' => true, 'item' => $item]);
