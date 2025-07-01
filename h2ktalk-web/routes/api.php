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
Route::middleware('simple-auth')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    // Admin only routes
    Route::middleware('admin')->group(function () {
        Route::get('/admin/email-notifications', [EmailNotificationController::class, 'index']);
        Route::get('/admin/users', [ApiController::class, 'getUsers']);
        Route::put('/admin/users/{id}', [ApiController::class, 'updateUser']);
        Route::delete('/admin/users/{id}', [ApiController::class, 'deleteUser']);
        
        // Packet logs routes
        Route::get('/admin/packet-logs', [ApiController::class, 'getPacketLogs']);
        Route::post('/admin/packet-logs/clear', [ApiController::class, 'clearPacketLogs']);
        Route::get('/admin/packet-logs/export', [ApiController::class, 'exportPacketLogs']);
        
        // Voice server routes
        Route::get('/admin/voice/stats', [ApiController::class, 'getVoiceStats']);
        Route::get('/admin/voice/logs', [ApiController::class, 'getVoiceLogs']);
        Route::post('/admin/voice/mute', [ApiController::class, 'muteUser']);
        Route::post('/admin/voice/kick', [ApiController::class, 'kickUser']);
        
        // Bot management routes
        Route::get('/admin/bots/stats', [ApiController::class, 'getBotStats']);
        Route::post('/admin/bots/start', [ApiController::class, 'startBot']);
        Route::post('/admin/bots/stop', [ApiController::class, 'stopBot']);
        Route::post('/admin/bots/restart', [ApiController::class, 'restartBot']);
    });
});
