<?php
declare(strict_types=1);

// Sessão para autenticação (cookie). Não usa localStorage no frontend.
if (session_status() !== PHP_SESSION_ACTIVE) {
  // Melhores padrões para hospedagem compartilhada.
  ini_set('session.cookie_httponly', '1');
  ini_set('session.use_strict_mode', '1');
  // Em HTTPS o PHP define Secure automaticamente se configurado; manter compatível.
  // SameSite=Lax ajuda contra CSRF básico em navegação normal.
  if (PHP_VERSION_ID >= 70300) {
    session_set_cookie_params([
      'lifetime' => 0,
      'path' => '/',
      'httponly' => true,
      'samesite' => 'Lax',
    ]);
  }
  session_name('satf_session');
  session_start();
}

function json_response($data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  // Mesma origem (seu site). Se precisar consumir de outro domínio, ajuste CORS aqui.
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function require_method(string $method): void {
  $actual = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
  if ($actual !== strtoupper($method)) {
    json_response(['ok' => false, 'error' => 'Método inválido'], 405);
  }
}

function read_json_body(): array {
  $raw = file_get_contents('php://input');
  if ($raw === false || trim($raw) === '') return [];
  $data = json_decode($raw, true);
  if (!is_array($data)) {
    json_response(['ok' => false, 'error' => 'JSON inválido'], 400);
  }
  return $data;
}

function new_id(): string {
  try {
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return sprintf('%s-%s-%s-%s-%s',
      substr($hex, 0, 8),
      substr($hex, 8, 4),
      substr($hex, 12, 4),
      substr($hex, 16, 4),
      substr($hex, 20, 12)
    );
  } catch (Throwable) {
    return (string)time() . '-' . bin2hex((string)mt_rand());
  }
}

function pdo_execute(PDO $pdo, string $sql, array $params = []): void {
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
}

function pdo_fetch_one(PDO $pdo, string $sql, array $params = []): ?array {
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $row = $stmt->fetch();
  return $row === false ? null : $row;
}

function pdo_fetch_all(PDO $pdo, string $sql, array $params = []): array {
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  return $stmt->fetchAll();
}

// Conexão com banco (PDO) centralizada.
require_once __DIR__ . '/_db.php';

function current_user(): ?array {
  $u = $_SESSION['user'] ?? null;
  return is_array($u) ? $u : null;
}

function require_login(): array {
  $u = current_user();
  if (!$u) {
    json_response(['ok' => false, 'error' => 'Não autenticado'], 401);
  }
  return $u;
}

function require_admin(): array {
  $u = require_login();
  $perfil = (string)($u['perfil'] ?? '');
  if ($perfil !== 'Administrador') {
    json_response(['ok' => false, 'error' => 'Acesso restrito'], 403);
  }
  return $u;
}
