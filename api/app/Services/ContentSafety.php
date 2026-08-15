<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class ContentSafety
{
    private const BLOCKED_PATTERNS = [
        '/\b(?:cocaine|heroin|meth|methamphetamine|fentanyl|weed|marijuana|hashish)\b/iu',
        '/\b(?:gun|rifle|pistol|ammo|ammunition|explosive|bomb)\b/iu',
        '/\b(?:porn|porno|xxx|nude|nudes|sex\s*service)\b/iu',
        '/(?:كوكايين|هيروين|شبو|مخدرات|حشيش|ماريجوانا)/u',
        '/(?:مسدس|رشاش|بندقية|ذخيرة|متفجرات|قنبلة)/u',
        '/(?:اباحي|إباحي|اباحية|إباحية|صور\s*عارية|جنس\s*مدفوع)/u',
    ];

    public function ensureAllowed(string ...$texts): void
    {
        $text = mb_strtolower(trim(implode("\n", $texts)));
        if ($text === '') return;

        foreach (self::BLOCKED_PATTERNS as $pattern) {
            if (preg_match($pattern, $text)) {
                throw ValidationException::withMessages([
                    'content' => 'يحتوي النص على محتوى محظور وفق سياسة الاستخدام. عدّل النص ثم حاول مرة أخرى.',
                ]);
            }
        }
    }
}
