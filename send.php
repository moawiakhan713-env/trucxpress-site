<?php
/*
 * TrucXpress — website request mailer.
 * Receives the popup / contact forms (assets/js/popup.js) and emails them
 * to the inbox below. The recipient is fixed here and never taken from
 * the request; only plain field values are copied into the message body.
 */

const INBOX = 'info@trucxpress.com';
const FROM  = 'TrucXpress Website <no-reply@trucxpress.com>';

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
$subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$headers = [
    'From: ' . FROM,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
];
$email = one_line($_POST['email'] ?? '', 200);
if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $headers[] = 'Reply-To: ' . $email;
}

$body = "New request from trucxpress.com\n"
      . "Form: {$title}\n"
      . ($page !== '' ? "Page: {$page}\n" : '')
      . "Sent: " . gmdate('Y-m-d H:i') . " UTC\n\n"
      . implode("\n", $lines) . "\n";

$ok = @mail(INBOX, $subject, $body, implode("\r\n", $headers));
if (!$ok) http_response_code(500);
echo json_encode(['ok' => (bool)$ok]);
