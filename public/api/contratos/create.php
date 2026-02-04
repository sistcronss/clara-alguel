<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('POST');
require_login();
$data = read_json_body();

function next_codigo(PDO $pdo): string {
  $row = pdo_fetch_one($pdo, "SELECT MAX(CAST(SUBSTRING(codigo, 4) AS UNSIGNED)) AS maxn FROM contratos WHERE codigo LIKE 'CT-%'");
  $max = (int)($row['maxn'] ?? 0);
  return 'CT-' . str_pad((string)($max + 1), 5, '0', STR_PAD_LEFT);
}

$id = trim((string)($data['id'] ?? ''));
if ($id === '') $id = new_id();

$clienteId = trim((string)($data['clienteId'] ?? ''));
if ($clienteId === '') json_response(['ok' => false, 'error' => 'clienteId é obrigatório'], 400);

$pdo = pdo();

$codigo = trim((string)($data['codigo'] ?? ''));
if ($codigo === '') $codigo = next_codigo($pdo);

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

try {
  $pdo->beginTransaction();

  pdo_execute($pdo,
    'INSERT INTO contratos (id, codigo, clienteId, evento, dataEvento, retirada, devolucao, desconto, status, observacoes, createdAt, updatedAt) VALUES (:id,:codigo,:clienteId,:evento,:dataEvento,:retirada,:devolucao,:desconto,:status,:obs,UTC_TIMESTAMP(),NULL)',
    [
      ':id' => $id,
      ':codigo' => $codigo,
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

  if (count($pecasIds) > 0) {
    $stmt = $pdo->prepare('INSERT INTO contratos_pecas (contratoId, pecaId) VALUES (:cid, :pid)');
    foreach ($pecasIds as $pid) {
      $pid = trim((string)$pid);
      if ($pid === '') continue;
      $stmt->execute([':cid' => $id, ':pid' => $pid]);
    }
  }

  $pdo->commit();
} catch (PDOException $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_response(['ok' => false, 'error' => 'Erro ao criar contrato', 'detail' => $e->getMessage()], 500);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_response(['ok' => false, 'error' => 'Erro ao criar contrato', 'detail' => $e->getMessage()], 500);
}

$item = pdo_fetch_one($pdo, 'SELECT * FROM contratos WHERE id = :id', [':id' => $id]);
$rows = pdo_fetch_all($pdo, 'SELECT pecaId FROM contratos_pecas WHERE contratoId = :id', [':id' => $id]);
$item['pecasIds'] = array_map(fn($r) => (string)$r['pecaId'], $rows);

json_response(['ok' => true, 'item' => $item]);
