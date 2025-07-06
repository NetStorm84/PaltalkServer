@extends('layouts.app')

@section('title', 'Admin Login - h2ktalk')

@section('content')
<!-- Login Section -->
<section class="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(120,119,198,0.3),transparent_50%),radial-gradient(circle_at_70%_70%,rgba(75,85,99,0.3),transparent_50%)]"></div>
    
    <div class="relative max-w-sm mx-auto px-4 pt-20 pb-32">
        <!-- Logo -->
        <div class="text-center mb-8">
            <div class="text-6xl mb-4">🌐</div>
            <h1 class="text-4xl font-black leading-tight">
                h2ktalk
                <span class="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    Admin
                </span>
            </h1>
            <p class="text-lg text-blue-100 mt-2">
                Secure access to server management
            </p>
        </div>
        
        <!-- Login Form -->
        <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-2xl">
            <div id="errorMessage" class="hidden bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl mb-6"></div>
            <div id="successMessage" class="hidden bg-green-500/20 border border-green-500/50 text-green-100 px-4 py-3 rounded-xl mb-6"></div>
            
            <form id="loginForm" class="space-y-6">
                <div>
                    <label for="username" class="block text-sm font-semibold text-white mb-2">
                        Username
                    </label>
                    <input 
                        type="text" 
                        id="username" 
                        name="username" 
                        required 
                        autocomplete="username"
                        class="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter your username"
                    >
                </div>
                
                <div>
                    <label for="password" class="block text-sm font-semibold text-white mb-2">
                        Password
                    </label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        required 
                        autocomplete="current-password"
                        class="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter your password"
                    >
                </div>
                
                <button 
                    type="submit" 
                    class="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" 
                    id="loginBtn"
                >
                    Sign In
                </button>
            </form>
            
            <!-- Info Box -->
            <div class="mt-6 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                <div class="flex items-center gap-3 mb-2">
                    <div class="text-cyan-400">🔐</div>
                    <h3 class="text-white font-semibold">Secure Access</h3>
                </div>
                <p class="text-blue-100 text-sm">
                    Enter your admin credentials to access the server dashboard.
                </p>
            </div>
        </div>
        
        <!-- Back Link -->
        <div class="text-center mt-8">
            <a href="{{ route('home') }}" class="text-blue-200 hover:text-white transition-colors duration-200 flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                Back to Home
            </a>
        </div>
    </div>
</section>
@endsection

@section('scripts')
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

function setLoading(isLoading) {
    if (isLoading) {
        loginBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Signing In...';
        loginBtn.disabled = true;
    } else {
        loginBtn.innerHTML = 'Sign In';
        loginBtn.disabled = false;
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showError(errorMessage, 'Please enter both username and password.');
        hideMessage(successMessage);
        return;
    }
    
    setLoading(true);
    hideMessage(errorMessage);
    hideMessage(successMessage);
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showSuccess(successMessage, 'Login successful! Redirecting...');
            hideMessage(errorMessage);
            
            // Store token for future requests
            localStorage.setItem('admin_token', data.token);
            
            setTimeout(() => {
                window.location.href = '{{ route("admin.dashboard") }}';
            }, 1000);
        } else {
            showError(errorMessage, data.error || 'Login failed. Please check your credentials.');
            hideMessage(successMessage);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showError(errorMessage, 'An error occurred. Please try again.');
        hideMessage(successMessage);
    } finally {
        setLoading(false);
    }
});

// Auto-focus username field
document.getElementById('username').focus();

// Clear messages when user starts typing
document.getElementById('username').addEventListener('input', () => {
    hideMessage(errorMessage);
    hideMessage(successMessage);
});
document.getElementById('password').addEventListener('input', () => {
    hideMessage(errorMessage);
    hideMessage(successMessage);
});
@endsection