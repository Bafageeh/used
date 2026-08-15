<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\ListingController;
use App\Http\Controllers\Api\ListingImageController;
use App\Http\Controllers\Api\ListingVideoController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status'=>'ok','service'=>'مستعمل مجاني']));
Route::get('/categories',[CategoryController::class,'index']);
Route::get('/listings',[ListingController::class,'index']);
Route::get('/listings/{listing}',[ListingController::class,'show']);
Route::post('/auth/request-otp',[AuthController::class,'requestOtp'])->middleware('throttle:5,1');
Route::post('/auth/verify-otp',[AuthController::class,'verifyOtp'])->middleware('throttle:10,1');
Route::post('/auth/login',[AuthController::class,'loginWithPin'])->middleware('throttle:10,1');
Route::post('/auth/admin-login',[AuthController::class,'adminLogin'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me',[AuthController::class,'me']); Route::post('/logout',[AuthController::class,'logout']); Route::delete('/account',[AuthController::class,'destroyAccount']);
    Route::get('/my/listings',[ListingController::class,'mine']); Route::post('/listings',[ListingController::class,'store']);
    Route::patch('/listings/{listing}',[ListingController::class,'update']); Route::post('/listings/{listing}/refresh',[ListingController::class,'refresh']);
    Route::delete('/listings/{listing}',[ListingController::class,'destroy']); Route::post('/listings/{listing}/images',[ListingImageController::class,'store']);
    Route::delete('/listing-images/{image}',[ListingImageController::class,'destroy']);
    Route::post('/listings/{listing}/video',[ListingVideoController::class,'store']);
    Route::delete('/listings/{listing}/video',[ListingVideoController::class,'destroy']);

    Route::get('/conversations',[ConversationController::class,'index']);
    Route::post('/listings/{listing}/conversation',[ConversationController::class,'start']);
    Route::get('/conversations/{conversation}/messages',[ConversationController::class,'messages']);
    Route::post('/conversations/{conversation}/messages',[ConversationController::class,'send']);
    Route::get('/messages/unread-count',[ConversationController::class,'unreadCount']);
    Route::get('/message-notifications',[ConversationController::class,'notifications']);

    Route::prefix('admin')->group(function () {
        Route::get('/dashboard',[AdminController::class,'dashboard']);
        Route::get('/users',[AdminController::class,'users']); Route::post('/users',[AdminController::class,'storeUser']);
        Route::patch('/users/{user}',[AdminController::class,'updateUser']); Route::delete('/users/{user}',[AdminController::class,'destroyUser']);
        Route::get('/listings',[AdminController::class,'listings']); Route::patch('/listings/{listing}',[AdminController::class,'updateListing']); Route::delete('/listings/{listing}',[AdminController::class,'destroyListing']);
        Route::post('/categories',[AdminController::class,'storeCategory']); Route::patch('/categories/{category}',[AdminController::class,'updateCategory']); Route::delete('/categories/{category}',[AdminController::class,'destroyCategory']);
        Route::get('/settings',[AdminController::class,'settings']); Route::post('/settings',[AdminController::class,'storeSetting']);
        Route::patch('/settings/{setting}',[AdminController::class,'updateSetting']); Route::delete('/settings/{setting}',[AdminController::class,'destroySetting']);
    });
});
