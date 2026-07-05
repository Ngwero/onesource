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

$greeting = $fullName !== '' ? "HI {$fullName}," : 'HI THERE,';
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
        $html = render_signup_email($greeting, $link, $siteUrl, $to);
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

function email_shell(string $heroEyebrow, string $heroTitle, string $heroSubtitle, string $bodyHtml, string $siteUrl): string
{
    $logo = htmlspecialchars(rtrim($siteUrl, '/') . '/brand/logo-on-dark-stacked.png', ENT_QUOTES, 'UTF-8');
    $hero = htmlspecialchars(rtrim($siteUrl, '/') . '/brand/email-hero.jpg', ENT_QUOTES, 'UTF-8');
    $shop = htmlspecialchars(rtrim($siteUrl, '/'), ENT_QUOTES, 'UTF-8');

    return <<<HTML
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{$heroTitle}</title></head>
<body style="margin:0;padding:0;background:#eceee9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceee9;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">
<tr><td style="background:#244a3b;padding:16px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td align="left" width="34%"><a href="{$shop}"><img src="{$logo}" alt="One Source" width="108" style="display:block;border:0;max-width:108px;"></a></td>
<td align="center" width="32%" style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;">One Source Account</td>
<td align="right" width="34%"><a href="{$shop}" style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#fff;text-decoration:underline;">Go to shop</a></td>
</tr></table>
</td></tr>
<tr><td bgcolor="#244a3b" background="{$hero}" style="background-color:#244a3b;background-image:linear-gradient(105deg,rgba(26,61,48,.92) 0%,rgba(36,74,59,.72) 45%,rgba(46,94,74,.35) 100%),url('{$hero}');background-size:cover;background-position:center;padding:40px 30px 36px;">
<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#b4cf5a;">{$heroEyebrow}</p>
<h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:800;color:#fff;">{$heroTitle}</h1>
<p style="margin:0;font-size:14px;line-height:1.55;color:#edf3e0;max-width:420px;">{$heroSubtitle}</p>
</td></tr>
<tr><td style="padding:28px 28px 24px;background:#fff;">{$bodyHtml}
<p style="margin:24px 0 0;font-size:14px;">Regards,<br><strong style="color:#244a3b;">One Source Account Team</strong></p>
</td></tr>
<tr><td style="background:#1c3d2f;padding:18px 28px;text-align:center;">
<p style="margin:0 0 8px;font-size:11px;color:#9bb5a8;">You are receiving this because you have a One Source account.</p>
<p style="margin:0;font-size:10px;color:#7a9488;">© One Source · Fresh produce delivered across Uganda</p>
</td></tr>
</table></td></tr></table></body></html>
HTML;
}

function dashed_box(string $inner): string
{
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 10px;"><tr><td style="border:2px dashed #2e5e4a;border-radius:12px;padding:26px 24px 24px;background:#f4f7ef;text-align:center;">' . $inner . '</td></tr></table>';
}

function cta_button(string $href, string $label): string
{
    $safeHref = htmlspecialchars($href, ENT_QUOTES, 'UTF-8');
    $safeLabel = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');
    return '<a href="' . $safeHref . '" style="display:inline-block;min-width:200px;padding:14px 28px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#fff;text-decoration:none;background:#244a3b;border-radius:6px;border:1px solid #1a3d30;">' . $safeLabel . '</a>';
}

function render_otp_email(string $greeting, string $token, string $siteUrl): string
{
    $safeGreeting = htmlspecialchars($greeting, ENT_QUOTES, 'UTF-8');
    $safeToken = htmlspecialchars($token, ENT_QUOTES, 'UTF-8');
    $box = dashed_box(
        '<p style="margin:0 0 10px;font-size:13px;text-align:left;"><span style="font-weight:700;color:#244a3b;">Verification code:</span>'
        . '<span style="display:block;margin-top:8px;font-size:32px;font-weight:800;letter-spacing:.22em;color:#244a3b;font-family:Courier New,monospace;">' . $safeToken . '</span></p>'
        . '<p style="margin:8px 0 0;font-size:12px;color:#5c5c58;">Valid for a short time · Do not share this code</p>'
    );
    $body = <<<HTML
<p style="margin:0 0 14px;font-size:14px;font-weight:700;">{$safeGreeting}</p>
<p style="margin:0 0 16px;font-size:14px;line-height:1.65;">We received a sign-in request for your One Source account. Use the code below on the login screen to continue.</p>
{$box}
HTML;

    return email_shell('Secure sign-in', 'Your verification code', 'Enter this code to complete your One Source login.', $body, $siteUrl);
}

function render_reset_email(string $greeting, string $email, string $link, string $siteUrl): string
{
    $safeGreeting = htmlspecialchars($greeting, ENT_QUOTES, 'UTF-8');
    $safeEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
    $safeLink = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
    $box = dashed_box(
        '<p style="margin:0 0 10px;font-size:13px;text-align:left;"><span style="font-weight:700;color:#244a3b;">Account:</span> <strong>' . $safeEmail . '</strong></p>'
        . '<p style="margin:0 0 16px;font-size:13px;text-align:left;"><span style="font-weight:700;color:#244a3b;">Action:</span> Password reset requested</p>'
        . '<p style="margin:0 0 14px;font-size:13px;color:#5c5c58;">Click below to choose a new password. This link can only be used once.</p>'
        . cta_button($link, 'Reset password')
        . '<p style="margin:16px 0 0;font-size:11px;word-break:break-all;color:#5c5c58;text-align:left;">Or copy this link:<br><a href="' . $safeLink . '" style="color:#2e5e4a;">' . $safeLink . '</a></p>'
    );
    $body = <<<HTML
<p style="margin:0 0 14px;font-size:14px;font-weight:700;">{$safeGreeting}</p>
<p style="margin:0 0 16px;font-size:14px;line-height:1.65;">A password reset was requested for your One Source account linked to <strong style="color:#244a3b;">{$safeEmail}</strong>.</p>
{$box}
HTML;

    return email_shell('Account security', 'Reset your password', 'Keep your One Source account secure with a new password.', $body, $siteUrl);
}

function render_signup_email(string $greeting, string $link, string $siteUrl, string $email = ''): string
{
    $safeGreeting = htmlspecialchars($greeting, ENT_QUOTES, 'UTF-8');
    $safeEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
    $emailLine = $safeEmail !== '' ? '<p style="margin:0 0 10px;font-size:13px;text-align:left;"><span style="font-weight:700;color:#244a3b;">Email:</span> <strong>' . $safeEmail . '</strong></p>' : '';
    $box = dashed_box(
        $emailLine
        . '<p style="margin:0 0 16px;font-size:13px;text-align:left;"><span style="font-weight:700;color:#244a3b;">Action:</span> Confirm your email address</p>'
        . '<p style="margin:0 0 14px;font-size:13px;color:#5c5c58;">One step left to activate your account and start shopping fresh produce.</p>'
        . cta_button($link, 'Confirm email')
    );
    $body = <<<HTML
<p style="margin:0 0 14px;font-size:14px;font-weight:700;">{$safeGreeting}</p>
<p style="margin:0 0 16px;font-size:14px;line-height:1.65;">Thank you for joining One Source. Please confirm your email address to activate your account.</p>
{$box}
HTML;

    return email_shell('Welcome aboard', 'Welcome to One Source', 'Fresh produce delivered across Uganda — confirm your email to start shopping.', $body, $siteUrl);
}
