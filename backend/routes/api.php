<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ListingController;
use App\Http\Controllers\Api\ListingImageController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'مستعمل مجاني']));
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/listings', [ListingController::class, 'index']);
Route::get('/listings/{listing}', [ListingController::class, 'show']);
Route::post('/auth/request-otp', [AuthController::class, 'requestOtp'])->middleware('throttle:5,1');
Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:10,1');
Route::post('/auth/login', [AuthController::class, 'loginWithPin'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/my/listings', [ListingController::class, 'mine']);
    Route::post('/listings', [ListingController::class, 'store']);
    Route::patch('/listings/{listing}', [ListingController::class, 'update']);
    Route::delete('/listings/{listing}', [ListingController::class, 'destroy']);
    Route::post('/listings/{listing}/images', [ListingImageController::class, 'store']);
    Route::delete('/listing-images/{image}', [ListingImageController::class, 'destroy']);

    Route::prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::patch('/users/{user}', [AdminController::class, 'updateUser']);
        Route::get('/listings', [AdminController::class, 'listings']);
        Route::patch('/listings/{listing}', [AdminController::class, 'updateListing']);
        Route::post('/categories', [AdminController::class, 'storeCategory']);
    });
});
