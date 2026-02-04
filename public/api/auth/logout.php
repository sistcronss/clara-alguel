<?php
declare(strict_types=1);
require __DIR__ . '/../_boot.php';

require_method('POST');

$_SESSION = [];
if (ini_get('session.use_cookies')) {
  $params = session_get_cookie_params();
  setcookie(session_name(), '', time() - 42000, $params['path'] ?? '/', $params['domain'] ?? '', (bool)($params['secure'] ?? false), (bool)($params['httponly'] ?? true));
}
session_destroy();

json_response(['ok' => true]);
