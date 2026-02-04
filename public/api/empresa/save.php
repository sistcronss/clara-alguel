<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('POST');
require_admin();
$data = read_json_body();

$id = trim((string)($data['id'] ?? 'empresa-1'));
if ($id === '') $id = 'empresa-1';

$nome = trim((string)($data['nome'] ?? ''));
$logo = (string)($data['logo'] ?? null);
$telefone = trim((string)($data['telefone'] ?? ''));
$endereco = trim((string)($data['endereco'] ?? ''));

$pdo = pdo();

$exists = pdo_fetch_one($pdo, 'SELECT id FROM empresa WHERE id = :id', [':id' => $id]);
if ($exists) {
  pdo_execute($pdo,
    'UPDATE empresa SET nome=:nome, logo=:logo, telefone=:telefone, endereco=:endereco, updatedAt=UTC_TIMESTAMP() WHERE id=:id',
    [
      ':id' => $id,
      ':nome' => ($nome !== '' ? $nome : null),
      ':logo' => ($logo !== '' ? $logo : null),
      ':telefone' => ($telefone !== '' ? $telefone : null),
      ':endereco' => ($endereco !== '' ? $endereco : null),
    ]
  );
} else {
  pdo_execute($pdo,
    'INSERT INTO empresa (id, nome, logo, telefone, endereco, createdAt, updatedAt) VALUES (:id,:nome,:logo,:telefone,:endereco,UTC_TIMESTAMP(),NULL)',
    [
      ':id' => $id,
      ':nome' => ($nome !== '' ? $nome : null),
      ':logo' => ($logo !== '' ? $logo : null),
      ':telefone' => ($telefone !== '' ? $telefone : null),
      ':endereco' => ($endereco !== '' ? $endereco : null),
    ]
  );
}

$item = pdo_fetch_one($pdo, 'SELECT * FROM empresa WHERE id = :id', [':id' => $id]);
json_response(['ok' => true, 'item' => $item]);
