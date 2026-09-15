<?php
/**
 * One Source — HTTPS mail relay for Railway / the mobile API
 *
 * Upload next to send-auth-email.php, e.g.:
 *   public_html/onesource-api/send-app-mail.php
 *
 * Then on Railway / server/.env set:
 *   CPANEL_MAIL_URL=https://one-sourcebrand.com/onesource-api/send-app-mail.php
 *   CPANEL_MAIL_SECRET=a-long-random-string
 *
 * Uses PHP mail() on the cPanel server (works when remote SMTP is blocked).
 */

declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-OneSource-Mail-Secret');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$MAIL_SECRET = getenv('ONESOURCE_APP_MAIL_SECRET') ?: 'CHANGE_ME_LONG_RANDOM_SECRET';
$FROM_EMAIL = getenv('ONESOURCE_FROM_EMAIL') ?: 'noreply@one-sourcebrand.com';
$FROM_NAME = getenv('ONESOURCE_FROM_NAME') ?: 'One Source';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if ($MAIL_SECRET === '' || str_contains($MAIL_SECRET, 'CHANGE_ME')) {
    http_response_code(503);
    echo json_encode(['error' => 'Mail secret not configured on cPanel']);
    exit;
}

$headers = array_change_key_case(getallheaders() ?: [], CASE_LOWER);
$provided = '';
if (!empty($headers['x-onesource-mail-secret'])) {
    $provided = trim($headers['x-onesource-mail-secret']);
} elseif (!empty($headers['authorization']) && preg_match('/^Bearer\s+(.+)$/i', $headers['authorization'], $m)) {
    $provided = trim($m[1]);
}

if ($provided === '' || !hash_equals($MAIL_SECRET, $provided)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$to = trim((string) ($payload['to'] ?? ''));
$subject = trim((string) ($payload['subject'] ?? ''));
$html = (string) ($payload['html'] ?? '');
$text = (string) ($payload['text'] ?? strip_tags($html));

if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL) || $subject === '' || $html === '') {
    http_response_code(400);
    echo json_encode(['error' => 'to, subject, and html are required']);
    exit;
}

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$mailHeaders = [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: =?UTF-8?B?' . base64_encode($FROM_NAME) . '?= <' . $FROM_EMAIL . '>',
    'Reply-To: ' . $FROM_EMAIL,
    'X-Mailer: One Source App Mail',
];

$ok = mail($to, $encodedSubject, $html, implode("\r\n", $mailHeaders));
if (!$ok) {
    http_response_code(500);
    echo json_encode(['error' => 'PHP mail() failed']);
    exit;
}

echo json_encode(['ok' => true]);
