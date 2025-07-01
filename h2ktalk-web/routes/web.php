<?php

use Illuminate\Support\Facades\Route;

// Main website routes
Route::get('/', function () {
    return view('index');
})->name('home');

Route::get('/register', function () {
    return view('register');
})->name('register');

Route::get('/download', function () {
    return response()->download(public_path('Paltalk.exe'));
})->name('download');

// Admin routes
Route::prefix('admin')->group(function () {
    Route::get('/login', function () {
        return view('admin.login');
    })->name('admin.login');
    
    Route::get('/dashboard', function () {
        return view('admin.dashboard');
    })->name('admin.dashboard');
    
    Route::get('/users', function () {
        return view('admin.users');
    })->name('admin.users');
    
    Route::get('/packet-logs', function () {
        return view('admin.packet-logs');
    })->name('admin.packet-logs');
    
    Route::get('/voice-logs', function () {
        return view('admin.voice-logs');
    })->name('admin.voice-logs');
    
    Route::get('/bot-management', function () {
        return view('admin.bot-management');
    })->name('admin.bot-management');
});

// Add a login route that redirects to admin login
Route::get('/login', function () {
    return redirect()->route('admin.login');
})->name('login');
