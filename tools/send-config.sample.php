<?php
/*
 * TrucXpress contact-form SMTP settings (optional, but the most reliable way).
 *
 * 1. Copy this file and name the copy  send-config.php
 * 2. Put your real info@trucxpress.com mailbox password below.
 * 3. Upload it in hPanel File Manager to the folder ABOVE public_html
 *    (the one that contains public_html), not inside public_html.
 *
 * Never commit the real file to GitHub. send.php finds it automatically.
 */
return [
    'smtp_host' => 'smtp.hostinger.com',
    'smtp_port' => 465,
    'smtp_user' => 'info@trucxpress.com',
    'smtp_pass' => 'PUT-MAILBOX-PASSWORD-HERE',
];
