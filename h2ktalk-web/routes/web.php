<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

// Socket.IO proxy route - proxy requests to Node.js server
Route::any('/socket.io/{path?}', function (Request $request, $path = '') {
    $nodeServerUrl = env('CHAT_SERVER_URL', 'http://host.docker.internal:3000');
    $url = $nodeServerUrl . '/socket.io/' . $path;
    
    // Add query parameters
    if ($request->getQueryString()) {
        $url .= '?' . $request->getQueryString();
    }
    
    // Create a cURL request to proxy to Node.js server
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $request->method());
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    // Forward headers
    $headers = [];
    foreach ($request->headers->all() as $key => $values) {
        if (!in_array(strtolower($key), ['host', 'content-length'])) {
            $headers[] = $key . ': ' . implode(', ', $values);
        }
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    // Forward request body for POST/PUT requests
    if (in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $request->getContent());
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    
    return response($response, $httpCode)->header('Content-Type', $contentType ?: 'text/plain');
})->where('path', '.*');

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
