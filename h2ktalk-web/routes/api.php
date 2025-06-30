<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\EmailNotificationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ApiController;

// Registration routes
Route::post('/register', [RegistrationController::class, 'register']);
Route::post('/check-nickname', [RegistrationController::class, 'checkNickname']);

// Email notification routes
Route::post('/notify-signup', [EmailNotificationController::class, 'signup']);
Route::post('/notify-unsubscribe', [EmailNotificationController::class, 'unsubscribe']);

// Authentication routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout']);

// Server stats and integration (for chat server)
Route::get('/stats', [ApiController::class, 'stats']);
Route::get('/server-state', [ApiController::class, 'serverState']);

// Admin routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    // Admin only routes
    Route::middleware('admin')->group(function () {
        Route::get('/admin/email-notifications', [EmailNotificationController::class, 'index']);
        Route::get('/admin/users', [ApiController::class, 'getUsers']);
    });
});
