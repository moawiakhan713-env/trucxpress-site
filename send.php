<?php
/*
 * TrucXpress — website request mailer.
 * Receives the popup / contact forms (assets/js/popup.js) and emails them
 * to the inbox below. The recipient is fixed here and never taken from
 * the request; only plain field values are copied into the message body.
 *
 * Delivery, in order:
 *  1. SMTP login to the Hostinger mailbox, if send-config.php exists
 *     (most reliable; see README "Contact form email").
 *  2. PHP mail(), sent from the real info@ mailbox with a matching
 *     envelope sender so Hostinger accepts it.
 * Every request is also appended to a private backup file one folder
 * ABOVE public_html (trucxpress-leads/), so no lead is lost even if
 * email fails. That folder is not reachable from the web.
 */

const INBOX     = 'info@trucxpress.com';
const FROM_NAME = 'TrucXpress Website';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false]);
    exit;
}

// Spam traps: a hidden field humans never fill, and a form submitted
// faster than a person could type. Bots get a normal-looking reply.
$elapsed = (int)($_POST['elapsed_ms'] ?? 0);
if (!empty($_POST['company_website']) || $elapsed < 1500) {
    echo json_encode(['ok' => true]);
    exit;
}

function clean_value($v, $max = 1500) {
    if (!is_string($v)) return '';
    $v = str_replace(["\r", "\0"], '', trim($v));
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}
function one_line($v, $max) {
    return str_replace("\n", ' ', clean_value($v, $max));
}

$title = one_line($_POST['form_title'] ?? 'Website request', 120);
$page  = one_line($_POST['page'] ?? '', 200);
$skip  = ['company_website', 'elapsed_ms', 'form_title', 'form_type', 'page'];

$lines = [];
$count = 0;
foreach ($_POST as $key => $val) {
    if (in_array($key, $skip, true) || !preg_match('/^[a-z_]{1,40}$/', $key)) continue;
    if (++$count > 30) break;
    if (is_array($val)) {
        $parts = [];
        foreach (array_slice($val, 0, 15) as $item) {
            $item = one_line($item, 200);
            if ($item !== '') $parts[] = $item;
        }
        $val = implode(', ', $parts);
    } else {
        $val = clean_value($val);
    }
    if ($val === '') continue;
    $lines[] = ucfirst(str_replace('_', ' ', $key)) . ': ' . $val;
}

if (!$lines) {
    http_response_code(400);
    echo json_encode(['ok' => false]);
    exit;
}

$name = one_line($_POST['full_name'] ?? trim(($_POST['first_name'] ?? '') . ' ' . ($_POST['last_name'] ?? '')), 80);
$subject = 'TrucXpress: ' . $title . ($name !== '' ? ' - ' . $name : '');
$subjectPlain = $subject;
$subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$email = one_line($_POST['email'] ?? '', 200);
$replyTo = ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) ? $email : '';

$body = "New request from trucxpress.com\n"
      . "Form: {$title}\n"
      . ($page !== '' ? "Page: {$page}\n" : '')
      . "Sent: " . gmdate('Y-m-d H:i') . " UTC\n\n"
      . implode("\n", $lines) . "\n";

save_backup($subjectPlain, $body);

$cfg = load_config();
$ok = false;
if ($cfg && !empty($cfg['smtp_user']) && !empty($cfg['smtp_pass'])) {
    $ok = smtp_send($cfg, INBOX, $subject, $body, $replyTo);
}
if (!$ok) {
    $from = ($cfg['smtp_user'] ?? '') ?: INBOX;
    $headers = [
        'From: ' . FROM_NAME . ' <' . $from . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'X-Mailer: TrucXpress website',
    ];
    if ($replyTo !== '') $headers[] = 'Reply-To: ' . $replyTo;
    $ok = @mail(INBOX, $subject, $body, implode("\r\n", $headers), '-f' . $from);
}
if (!$ok) http_response_code(500);
echo json_encode(['ok' => (bool)$ok]);

/* ---------------------------------------------------------------- */

function load_config() {
    foreach ([dirname(__DIR__) . '/send-config.php', __DIR__ . '/send-config.php'] as $f) {
        if (is_file($f)) {
            $c = include $f;
            if (is_array($c)) return $c;
        }
    }
    return null;
}

function save_backup($subject, $body) {
    $dir = dirname(__DIR__) . '/trucxpress-leads';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) return;
    $entry = str_repeat('=', 60) . "\n" . $subject . "\n" . $body . "\n";
    @file_put_contents($dir . '/leads-' . gmdate('Y-m') . '.txt', $entry, FILE_APPEND | LOCK_EX);
}

/* Minimal SMTP client (implicit TLS, AUTH LOGIN). Hostinger: smtp.hostinger.com:465 */
function smtp_send($cfg, $to, $subject, $body, $replyTo) {
    $host = $cfg['smtp_host'] ?? 'smtp.hostinger.com';
    $port = (int)($cfg['smtp_port'] ?? 465);
    $user = $cfg['smtp_user'];
    $ctx  = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $fp = @stream_socket_client("ssl://{$host}:{$port}", $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) return false;
    stream_set_timeout($fp, 15);

    $read = function () use ($fp) {
        $data = '';
        while (($line = fgets($fp, 1024)) !== false) {
            $data .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break;
        }
        return (int)substr($data, 0, 3);
    };
    $cmd = function ($line, $codes) use ($fp, $read) {
        if ($line !== null) fwrite($fp, $line . "\r\n");
        return in_array($read(), (array)$codes, true);
    };

    $msg = implode("\r\n", array_filter([
        'Date: ' . date('r'),
        'From: ' . FROM_NAME . ' <' . $user . '>',
        'To: <' . $to . '>',
        'Subject: ' . $subject,
        $replyTo !== '' ? 'Reply-To: ' . $replyTo : '',
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@trucxpress.com>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ])) . "\r\n\r\n";
    foreach (explode("\n", $body) as $l) {
        $msg .= ($l !== '' && $l[0] === '.' ? '.' : '') . $l . "\r\n";
    }

    $ok = $cmd(null, 220)
       && $cmd('EHLO trucxpress.com', 250)
       && $cmd('AUTH LOGIN', 334)
       && $cmd(base64_encode($user), 334)
       && $cmd(base64_encode($cfg['smtp_pass']), 235)
       && $cmd('MAIL FROM:<' . $user . '>', 250)
       && $cmd('RCPT TO:<' . $to . '>', [250, 251])
       && $cmd('DATA', 354)
       && $cmd($msg . '.', 250);
    @fwrite($fp, "QUIT\r\n");
    fclose($fp);
    return $ok;
}
