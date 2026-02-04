<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_response(['ok' => false, 'error' => 'Método inválido'], 405);
}

$me = require_login();

$userId = isset($_POST['userId']) ? trim((string)$_POST['userId']) : '';
if ($userId === '') {
  json_response(['ok' => false, 'error' => 'userId é obrigatório'], 400);
}

$isAdmin = ((string)($me['perfil'] ?? '') === 'Administrador');
if (!$isAdmin && (string)($me['id'] ?? '') !== $userId) {
  json_response(['ok' => false, 'error' => 'Acesso restrito'], 403);
}

if (!isset($_FILES['file'])) {
  json_response(['ok' => false, 'error' => 'Arquivo (file) é obrigatório'], 400);
}

$f = $_FILES['file'];
if (!is_array($f) || ($f['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
  json_response(['ok' => false, 'error' => 'Falha no upload'], 400);
}

$tmp = (string)($f['tmp_name'] ?? '');
$origName = (string)($f['name'] ?? '');
$size = (int)($f['size'] ?? 0);

if ($size <= 0 || $size > 3 * 1024 * 1024) {
  json_response(['ok' => false, 'error' => 'Tamanho inválido (máx 3MB)'], 400);
}

$mime = function_exists('mime_content_type') ? (string)@mime_content_type($tmp) : '';
if ($mime === '') $mime = (string)($f['type'] ?? '');
if (strpos($mime, 'image/') !== 0) {
  json_response(['ok' => false, 'error' => 'Envie uma imagem'], 400);
}

$ext = 'jpg';
if ($mime === 'image/png') $ext = 'png';
if ($mime === 'image/webp') $ext = 'webp';

$uploadDir = realpath(__DIR__ . '/../../uploads/avatars');
if ($uploadDir === false) {
  json_response(['ok' => false, 'error' => 'Diretório de upload não encontrado: public/uploads/avatars'], 500);
}

$filename = 'avatar-' . preg_replace('/[^a-zA-Z0-9_-]/', '', $userId) . '-' . time() . '.' . $ext;
$destPath = $uploadDir . DIRECTORY_SEPARATOR . $filename;

if (!move_uploaded_file($tmp, $destPath)) {
  json_response(['ok' => false, 'error' => 'Não foi possível salvar o arquivo'], 500);
}

$url = public_base_url() . '/uploads/avatars/' . $filename;

$pdo = pdo();
$stmt = $pdo->prepare('UPDATE funcionarios SET foto = :foto, updatedAt = NOW() WHERE id = :id');
$stmt->execute([':foto' => $url, ':id' => $userId]);

json_response(['ok' => true, 'url' => $url]);
