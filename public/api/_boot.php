<?php
declare(strict_types=1);

function json_response($data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  // Mesma origem (seu site). Se precisar consumir de outro domínio, ajuste CORS aqui.
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function load_config(): array {
  $path = __DIR__ . '/_config.php';
  if (!file_exists($path)) {
    json_response([
      'ok' => false,
      'error' => 'Config não encontrada. Copie public/api/_config.php.example para public/api/_config.php e preencha.',
    ], 500);
  }

  $cfg = require $path;
  if (!is_array($cfg)) {
    json_response(['ok' => false, 'error' => 'Config inválida'], 500);
  }

  foreach (['DB_HOST','DB_NAME','DB_USER','DB_PASS'] as $k) {
    if (!isset($cfg[$k]) || $cfg[$k] === '') {
      json_response(['ok' => false, 'error' => 'Config incompleta: faltando ' . $k], 500);
    }
  }

  return $cfg;
}

function pdo(): PDO {
  $cfg = load_config();

  $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $cfg['DB_HOST'], $cfg['DB_NAME']);
  try {
    $pdo = new PDO($dsn, $cfg['DB_USER'], $cfg['DB_PASS'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
  } catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Falha ao conectar no MySQL', 'detail' => $e->getMessage()], 500);
  }
}

function public_base_url(): string {
  $cfg = load_config();
  $base = trim((string)($cfg['PUBLIC_BASE_URL'] ?? ''));
  if ($base !== '') return rtrim($base, '/');

  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
  return $scheme . '://' . $host;
}
