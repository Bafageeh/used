<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class WhatsAppOtpService
{
    public function send(string $phone, string $code): void
    {
        $token = config('marketplace.whatsapp.token');
        $phoneNumberId = config('marketplace.whatsapp.phone_number_id');
        $template = config('marketplace.whatsapp.template', 'verify_code');
        $language = config('marketplace.whatsapp.language', 'ar');
        $graphVersion = config('marketplace.whatsapp.graph_version', 'v23.0');

        if (!$token || !$phoneNumberId) {
            if (app()->environment('local', 'testing')) {
                logger()->info('Marketplace OTP', compact('phone', 'code'));
                return;
            }
            throw new RuntimeException('خدمة التحقق عبر واتساب غير مهيأة.');
        }

        $response = Http::withToken($token)
            ->timeout(15)
            ->post("https://graph.facebook.com/{$graphVersion}/{$phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => $phone,
                'type' => 'template',
                'template' => [
                    'name' => $template,
                    'language' => ['code' => $language],
                    'components' => [
                        [
                            'type' => 'body',
                            'parameters' => [
                                ['type' => 'text', 'text' => $code],
                            ],
                        ],
                        [
                            'type' => 'button',
                            'sub_type' => 'url',
                            'index' => '0',
                            'parameters' => [
                                ['type' => 'text', 'text' => $code],
                            ],
                        ],
                    ],
                ],
            ]);

        if ($response->failed()) {
            report(new RuntimeException('WhatsApp OTP failed: '.$response->body()));
            throw new RuntimeException('تعذر إرسال رمز التحقق الآن.');
        }
    }
}
