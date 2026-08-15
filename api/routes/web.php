<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response(<<<'HTML'
<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>مستعمل مجاني</title>
    <style>
        *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f7f9;color:#17202a;font-family:Tahoma,Arial,sans-serif}.card{width:min(92%,520px);padding:42px 30px;text-align:center;background:#fff;border-radius:24px;box-shadow:0 18px 50px rgba(0,0,0,.08)}.logo{width:72px;height:72px;margin:auto;display:grid;place-items:center;border-radius:22px;background:#147d64;color:#fff;font-size:34px;font-weight:700}h1{margin:22px 0 10px;font-size:30px}p{margin:0;color:#65717d;line-height:1.9}.status{display:inline-flex;align-items:center;gap:8px;margin-top:24px;padding:10px 16px;border-radius:999px;background:#eaf8f3;color:#147d64;font-weight:700}.dot{width:9px;height:9px;border-radius:50%;background:#18a979}
    </style>
</head>
<body>
    <main class="card">
        <div class="logo">م</div>
        <h1>مستعمل مجاني</h1>
        <p>منصة سهلة وآمنة لعرض وشراء المنتجات المستعملة.</p>
        <div class="status"><span class="dot"></span> الخدمة تعمل</div>
    </main>
</body>
</html>
HTML, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
});

// Public legal and support URLs used by the mobile app and store listings.
Route::get('/privacy', fn () => response()->file(public_path('privacy.html')));
Route::get('/terms', fn () => response()->file(public_path('terms.html')));
Route::get('/delete-account', fn () => response()->file(public_path('delete-account.html')));
Route::get('/support', fn () => response()->file(public_path('support.html')));
