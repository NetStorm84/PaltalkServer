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
    })->name('admin.dashboard')->middleware('auth:sanctum');
    
    Route::get('/users', function () {
        return view('admin.users');
    })->name('admin.users')->middleware('auth:sanctum');
});
