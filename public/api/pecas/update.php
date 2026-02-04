<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('POST');
require_admin();
$data = read_json_body();

$id = trim((string)($data['id'] ?? ''));
if ($id === '') json_response(['ok' => false, 'error' => 'id é obrigatório'], 400);

$codigo = trim((string)($data['codigo'] ?? ''));
$tipo = trim((string)($data['tipo'] ?? ''));
$descricao = trim((string)($data['descricao'] ?? ''));
$tamanho = trim((string)($data['tamanho'] ?? ''));
$cor = trim((string)($data['cor'] ?? ''));
$valorAluguel = trim((string)($data['valorAluguel'] ?? ''));
$status = trim((string)($data['status'] ?? 'Disponivel'));
$observacoes = trim((string)($data['observacoes'] ?? ''));

if ($codigo === '') json_response(['ok' => false, 'error' => 'codigo é obrigatório'], 400);
if ($tipo === '') json_response(['ok' => false, 'error' => 'tipo é obrigatório'], 400);

$allowed = ['Disponivel','Manutencao','Inativa'];
if (!in_array($status, $allowed, true)) $status = 'Disponivel';

$valor = null;
if ($valorAluguel !== '') {
  $n = (float)str_replace(',', '.', $valorAluguel);
  if (!is_finite($n) || $n < 0) json_response(['ok' => false, 'error' => 'valorAluguel inválido'], 400);
  $valor = $n;
}

$pdo = pdo();
$exists = pdo_fetch_one($pdo, 'SELECT id FROM pecas WHERE id = :id', [':id' => $id]);
if (!$exists) json_response(['ok' => false, 'error' => 'Peça não encontrada'], 404);

try {
  pdo_execute($pdo,
    'UPDATE pecas SET codigo=:codigo, tipo=:tipo, descricao=:descricao, tamanho=:tamanho, cor=:cor, valorAluguel=:valor, status=:status, observacoes=:obs, updatedAt=UTC_TIMESTAMP() WHERE id=:id',
    [
      ':id' => $id,
      ':codigo' => $codigo,
      ':tipo' => $tipo,
      ':descricao' => ($descricao !== '' ? $descricao : null),
      ':tamanho' => ($tamanho !== '' ? $tamanho : null),
      ':cor' => ($cor !== '' ? $cor : null),
      ':valor' => $valor,
      ':status' => $status,
      ':obs' => ($observacoes !== '' ? $observacoes : null),
    ]
  );
} catch (PDOException $e) {
  if (str_contains($e->getMessage(), 'uk_pecas_codigo')) {
    json_response(['ok' => false, 'error' => 'Código já cadastrado'], 409);
  }
  json_response(['ok' => false, 'error' => 'Erro ao atualizar peça', 'detail' => $e->getMessage()], 500);
}

$item = pdo_fetch_one($pdo, 'SELECT * FROM pecas WHERE id = :id', [':id' => $id]);
json_response(['ok' => true, 'item' => $item]);
