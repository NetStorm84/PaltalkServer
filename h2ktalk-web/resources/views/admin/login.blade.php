@extends('layouts.app')

@section('title', 'Admin Login - h2ktalk.fun')

@section('styles')
.login-container {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 48px;
    max-width: 420px;
    width: 90%;
    margin: 2rem auto;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.logo-container {
    text-align: center;
    margin-bottom: 2rem;
}

.logo {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.login-container h1 {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: #ffffff;
}

.subtitle {
    text-align: center;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 2rem;
    font-size: 0.95rem;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #ffffff;
}

.form-group input {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    font-size: 1rem;
    font-family: 'Courier New', monospace;
    transition: border-color 0.2s ease;
}

.form-group input:focus {
    outline: none;
    border-color: #ff4500;
}

.form-group input::placeholder {
    color: rgba(255, 255, 255, 0.6);
}

.login-btn {
    width: 100%;
    background: #ff4500;
    color: #ffffff;
    border: 2px solid #ff4500;
    padding: 16px;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Courier New', monospace;
}

.login-btn:hover:not(:disabled) {
    background: #ff6600;
    border-color: #ff6600;
}

.login-btn:disabled {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
}

.info-box {
    background: rgba(255, 69, 0, 0.1);
    border: 1px solid #ff4500;
    border-radius: 4px;
    padding: 16px;
    margin-top: 24px;
}

.info-box h3 {
    color: #ffffff;
    font-size: 0.9rem;
    margin-bottom: 8px;
    font-weight: bold;
}

.info-box p {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.85rem;
    line-height: 1.4;
}

.loading {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #ffffff;
    animation: spin 1s ease-in-out infinite;
    margin-right: 8px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.back-link {
    text-align: center;
    margin-top: 1rem;
}

.back-link a {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    font-size: 0.9rem;
}

.back-link a:hover {
    color: #ff4500;
}

@media (max-width: 768px) {
    .login-container {
        padding: 40px 30px;
        max-width: 100%;
        margin: 1rem auto;
    }
    
    .login-container h1 {
        font-size: 1.8rem;
    }
    
    .form-group input {
        padding: 16px;
        font-size: 16px; /* Prevents zoom on iOS */
    }
    
    .login-btn {
        padding: 18px;
        font-size: 1rem;
    }
}

@media (max-width: 480px) {
    .login-container {
        padding: 30px 20px;
        margin: 0.5rem auto;
    }
    
    .login-container h1 {
        font-size: 1.6rem;
    }
    
    .form-group input {
        padding: 14px;
    }
    
    .login-btn {
        padding: 16px;
        font-size: 0.9rem;
    }
    
    .info-box {
        padding: 12px;
        margin-top: 20px;
    }
}
@endsection

@section('content')
<div class="login-container">
    <div class="logo-container">
        <div class="logo">🌐</div>
    </div>
    
    <h1>h2ktalk.fun Admin</h1>
    <p class="subtitle">Secure access to server management</p>
    
    <div id="errorMessage" class="error"></div>
    <div id="successMessage" class="success"></div>
    
    <form id="loginForm">
        <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" required autocomplete="username">
        </div>
        
        <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required autocomplete="current-password">
        </div>
        
        <button type="submit" class="login-btn" id="loginBtn">
            Sign In
        </button>
    </form>
    
    <div class="info-box">
        <h3>🔐 Secure Access</h3>
        <p>Enter your admin credentials to access the server dashboard.</p>
    </div>
    
    <div class="back-link">
        <a href="{{ route('home') }}">← Back to Home</a>
    </div>
</div>
@endsection

@section('scripts')
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

function setLoading(isLoading) {
    if (isLoading) {
        loginBtn.innerHTML = '<span class="loading"></span>Signing In...';
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