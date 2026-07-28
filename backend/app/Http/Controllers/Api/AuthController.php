<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\WhatsAppOtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function requestOtp(Request $request, WhatsAppOtpService $whatsApp)
    {
        $data = $request->validate([
            'phone' => ['required', 'regex:/^9665[0-9]{8}$/'],
            'purpose' => ['required', Rule::in(['register', 'login', 'reset_pin'])],
        ]);

        $user = User::where('phone', $data['phone'])->first();
        if ($data['purpose'] === 'register' && $user) {
            return response()->json(['message' => 'رقم الجوال مسجل مسبقًا.'], 422);
        }
        if ($data['purpose'] !== 'register' && !$user) {
            return response()->json(['message' => 'رقم الجوال غير مسجل.'], 404);
        }

        $recent = OtpCode::where('phone', $data['phone'])
            ->where('created_at', '>', now()->subMinute())->exists();
        if ($recent) {
            return response()->json(['message' => 'انتظر دقيقة قبل طلب رمز جديد.'], 429);
        }

        $code = (string) random_int(100000, 999999);
        OtpCode::where('phone', $data['phone'])->whereNull('verified_at')->delete();
        OtpCode::create([
            'phone' => $data['phone'],
            'purpose' => $data['purpose'],
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(5),
        ]);
        $whatsApp->send($data['phone'], $code);

        return ['message' => 'تم إرسال رمز التحقق عبر واتساب.', 'expires_in' => 300];
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'regex:/^9665[0-9]{8}$/'],
            'purpose' => ['required', Rule::in(['register', 'login', 'reset_pin'])],
            'code' => ['required', 'digits:6'],
            'name' => ['required_if:purpose,register', 'nullable', 'string', 'max:100'],
            'pin' => ['required_if:purpose,register,reset_pin', 'nullable', 'digits_between:4,8'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $otp = OtpCode::where('phone', $data['phone'])
            ->where('purpose', $data['purpose'])->whereNull('verified_at')
            ->latest()->first();

        if (!$otp || $otp->expires_at->isPast() || $otp->attempts >= 5) {
            return response()->json(['message' => 'انتهت صلاحية الرمز، اطلب رمزًا جديدًا.'], 422);
        }

        $otp->increment('attempts');
        if (!Hash::check($data['code'], $otp->code_hash)) {
            return response()->json(['message' => 'رمز التحقق غير صحيح.'], 422);
        }

        return DB::transaction(function () use ($data, $otp) {
            $otp->update(['verified_at' => now()]);
            $user = User::where('phone', $data['phone'])->first();

            if ($data['purpose'] === 'register') {
                $user = User::create([
                    'name' => $data['name'],
                    'phone' => $data['phone'],
                    'pin' => $data['pin'],
                    'phone_verified_at' => now(),
                ]);
            } elseif ($data['purpose'] === 'reset_pin') {
                $user->update(['pin' => $data['pin'], 'phone_verified_at' => now()]);
            }

            abort_if(!$user || !$user->is_active, 403, 'الحساب موقوف.');
            $token = $user->createToken($data['device_name'] ?? 'mobile')->plainTextToken;
            return ['token' => $token, 'user' => $user];
        });
    }

    public function loginWithPin(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'regex:/^9665[0-9]{8}$/'],
            'pin' => ['required', 'digits_between:4,8'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);
        $user = User::where('phone', $data['phone'])->first();
        if (!$user || !$user->pin || !Hash::check($data['pin'], $user->pin)) {
            return response()->json(['message' => 'رقم الجوال أو الرقم السري غير صحيح.'], 422);
        }
        abort_unless($user->is_active, 403, 'الحساب موقوف.');
        return [
            'token' => $user->createToken($data['device_name'] ?? 'mobile')->plainTextToken,
            'user' => $user,
        ];
    }

    public function me(Request $request)
    {
        return $request->user();
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->noContent();
    }
}
