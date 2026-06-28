<?php
/**
 * One Source — Supabase Send Email Hook (host this on cPanel)
 *
 * Upload to e.g. public_html/onesource-api/send-auth-email.php
 * Point Supabase → Authentication → Hooks → Send Email → HTTPS to this URL.
 *
 * Uses PHP mail() on the same server as cPanel — no remote SMTP needed.
 */

declare(strict_types=1);

header('Content-Type: application/json');

// --- Configuration (edit or set in cPanel environment) ---
$HOOK_SECRET = getenv('ONESOURCE_SEND_EMAIL_HOOK_SECRET') ?: 'PASTE_SUPABASE_HOOK_SECRET_HERE';
$FROM_EMAIL = getenv('ONESOURCE_FROM_EMAIL') ?: 'noreply@one-sourcebrand.com';
$FROM_NAME = getenv('ONESOURCE_FROM_NAME') ?: 'One Source';
$SHOP_URL = getenv('ONESOURCE_SHOP_URL') ?: 'https://www.onesourco.com';
$SUPABASE_URL = getenv('ONESOURCE_SUPABASE_URL') ?: 'https://kobbhuispglyflddjeqi.supabase.co';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$payload = file_get_contents('php://input') ?: '';
$headers = array_change_key_case(getallheaders() ?: [], CASE_LOWER);

if (!verify_standard_webhook($HOOK_SECRET, $payload, $headers)) {
    http_response_code(401);
    echo json_encode(['error' => ['message' => 'Invalid webhook signature']]);
    exit;
}

$data = json_decode($payload, true);
if (!is_array($data) || empty($data['user']['email']) || empty($data['email_data'])) {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'Invalid payload']]);
    exit;
}

$user = $data['user'];
$emailData = $data['email_data'];
$to = $user['email'];
$action = $emailData['email_action_type'] ?? '';
$token = $emailData['token'] ?? '';
$siteUrl = $emailData['site_url'] ?? $SHOP_URL;
$confirmUrl = $emailData['confirmation_url'] ?? $emailData['redirect_to'] ?? $siteUrl;
$fullName = trim($user['user_metadata']['full_name'] ?? '');

$greeting = $fullName !== '' ? "Dear {$fullName}," : 'Dear customer,';
$sent = false;

switch ($action) {
    case 'magiclink':
    case 'email':
        $subject = 'Your One Source sign-in code';
        $html = render_otp_email($greeting, $token, $siteUrl);
        $sent = send_mail($to, $subject, $html, $FROM_EMAIL, $FROM_NAME);
        break;

    case 'recovery':
        $subject = 'Reset your One Source password';
        $link = build_verify_link($SUPABASE_URL, 'recovery', $emailData);
        $html = render_reset_email($greeting, $to, $link, $siteUrl);
        $sent = send_mail($to, $subject, $html, $FROM_EMAIL, $FROM_NAME);
        break;

    case 'signup':
    case 'invite':
        $subject = 'Welcome to One Source — confirm your email';
        $link = build_verify_link($SUPABASE_URL, $action === 'invite' ? 'invite' : 'signup', $emailData);
        $html = render_signup_email($greeting, $link, $siteUrl);
        $sent = send_mail($to, $subject, $html, $FROM_EMAIL, $FROM_NAME);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => ['message' => "Unsupported email_action_type: {$action}"]]);
        exit;
}

if (!$sent) {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Failed to send email via cPanel mail()']]);
    exit;
}

http_response_code(200);
echo json_encode([]);

// --- Helpers ---

function verify_standard_webhook(string $secret, string $payload, array $headers): bool
{
    if ($secret === '' || str_contains($secret, 'PASTE_SUPABASE')) {
        return false;
    }

    $raw = $secret;
    if (str_starts_with($raw, 'v1,whsec_')) {
        $raw = substr($raw, strlen('v1,whsec_'));
    } elseif (str_starts_with($raw, 'whsec_')) {
        $raw = substr($raw, strlen('whsec_'));
    }

    $key = base64_decode($raw, true);
    if ($key === false) {
        return false;
    }

    $msgId = $headers['webhook-id'] ?? '';
    $timestamp = $headers['webhook-timestamp'] ?? '';
    $signatureHeader = $headers['webhook-signature'] ?? '';

    if ($msgId === '' || $timestamp === '' || $signatureHeader === '') {
        return false;
    }

    // Reject replays older than 5 minutes
    if (abs(time() - (int) $timestamp) > 300) {
        return false;
    }

    $signed = $msgId . '.' . $timestamp . '.' . $payload;
    $expected = base64_encode(hash_hmac('sha256', $signed, $key, true));

    foreach (explode(' ', $signatureHeader) as $part) {
        $bits = explode(',', $part, 2);
        if (count($bits) === 2 && $bits[0] === 'v1' && hash_equals($expected, $bits[1])) {
            return true;
        }
    }

    return false;
}

function send_mail(string $to, string $subject, string $html, string $fromEmail, string $fromName): bool
{
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . encode_address($fromName, $fromEmail),
        'Reply-To: ' . $fromEmail,
        'X-Mailer: One Source cPanel',
    ];

    return mail($to, $encodedSubject, $html, implode("\r\n", $headers));
}

function encode_address(string $name, string $email): string
{
    return '=?UTF-8?B?' . base64_encode($name) . '?= <' . $email . '>';
}

function build_verify_link(string $supabaseUrl, string $type, array $emailData): string
{
    $hash = $emailData['token_hash'] ?? '';
    $redirect = $emailData['redirect_to'] ?? '';
    if ($hash === '') {
        return $redirect ?: $GLOBALS['SHOP_URL'];
    }
    $base = rtrim($supabaseUrl, '/') . '/auth/v1/verify';
    $query = http_build_query([
        'token' => $hash,
        'type' => $type,
        'redirect_to' => $redirect,
    ]);
    return $base . '?' . $query;
}

function email_shell(string $eyebrow, string $title, string $subtitle, string $bodyHtml, string $siteUrl): string
{
    $logo = htmlspecialchars(rtrim($siteUrl, '/') . '/brand/logo-on-dark-horizontal.png', ENT_QUOTES, 'UTF-8');
    $shop = htmlspecialchars(rtrim($siteUrl, '/'), ENT_QUOTES, 'UTF-8');

    return <<<HTML
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>{$title}</title></head>
<body style="margin:0;padding:0;background:#eceee9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1c1c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceee9;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;border:1px solid #dde3dc;overflow:hidden;">
<tr><td style="background:linear-gradient(180deg,#2e5e4a,#244a3b);padding:28px 32px 24px;text-align:center;">
<img src="{$logo}" alt="One Source" width="200" style="display:block;margin:0 auto;border:0;max-width:200px;">
<p style="margin:14px 0 0;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#b4cf5a;">{$eyebrow}</p>
</td></tr>
<tr><td style="background:#faf9f6;padding:24px 32px 8px;border-bottom:1px solid #e8ebe4;">
<h1 style="margin:0;font-size:22px;font-weight:700;">{$title}</h1>
<p style="margin:8px 0 0;font-size:15px;color:#5c5c58;">{$subtitle}</p>
</td></tr>
<tr><td style="padding:28px 32px;">{$bodyHtml}
<p style="margin:24px 0 0;font-size:15px;">Kind regards,<br><strong style="color:#244a3b;">The One Source Team</strong></p>
</td></tr>
<tr><td style="background:#244a3b;padding:22px 32px;text-align:center;">
<p style="margin:0;font-size:11px;color:#9bb5a8;">© One Source · Fresh produce delivered across Uganda</p>
</td></tr>
</table></td></tr></table></body></html>
HTML;
}

function render_otp_email(string $greeting, string $token, string $siteUrl): string
{
    $safeGreeting = htmlspecialchars($greeting, ENT_QUOTES, 'UTF-8');
    $safeToken = htmlspecialchars($token, ENT_QUOTES, 'UTF-8');
    $body = <<<HTML
<p style="margin:0 0 20px;font-size:15px;">{$safeGreeting}</p>
<p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;">Enter this one-time code on the login screen to continue.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
<tr><td align="center" style="background:#f4f8f5;border:1px solid #c8dcc8;border-radius:12px;padding:28px 20px;">
<p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#5c7a68;">Your verification code</p>
<p style="margin:0;font-size:34px;font-weight:700;letter-spacing:.28em;color:#244a3b;font-family:Courier New,monospace;">{$safeToken}</p>
</td></tr></table>
HTML;

    return email_shell('Secure account access', 'Sign-in verification code', 'Use the code below to complete your login.', $body, $siteUrl);
}

function render_reset_email(string $greeting, string $email, string $link, string $siteUrl): string
{
    $safeGreeting = htmlspecialchars($greeting, ENT_QUOTES, 'UTF-8');
    $safeEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
    $safeLink = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
    $body = <<<HTML
<p style="margin:0 0 20px;font-size:15px;">{$safeGreeting}</p>
<p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;">A password reset was requested for <strong>{$safeEmail}</strong>.</p>
<p style="text-align:center;margin:0 0 20px;">
<a href="{$safeLink}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;background:#2e5e4a;border-radius:8px;">Reset password</a>
</p>
HTML;

    return email_shell('Account security', 'Reset your password', 'We received a request to change your account password.', $body, $siteUrl);
}

function render_signup_email(string $greeting, string $link, string $siteUrl): string
{
    $safeGreeting = htmlspecialchars($greeting, ENT_QUOTES, 'UTF-8');
    $safeLink = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
    $body = <<<HTML
<p style="margin:0 0 20px;font-size:15px;">{$safeGreeting}</p>
<p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;">Please confirm your email to activate your One Source account.</p>
<p style="text-align:center;margin:0 0 20px;">
<a href="{$safeLink}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;background:#2e5e4a;border-radius:8px;">Confirm email address</a>
</p>
HTML;

    return email_shell('Welcome aboard', 'Confirm your email address', 'One step left to start shopping fresh produce.', $body, $siteUrl);
}
