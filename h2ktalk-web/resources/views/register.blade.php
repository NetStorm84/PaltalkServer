@extends('layouts.app')

@section('title', 'Register for h2ktalk.fun - Join Classic Paltalk Community Chat')

@section('description', 'Create your free account to join the h2ktalk.fun community. Experience authentic 2002 Paltalk chat rooms with voice chat, text chat, and nostalgic interface.')

@section('styles')
.reg-container {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 40px;
    width: 100%;
    max-width: 420px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    margin: 0 auto;
    margin-top: 2rem;
}

.reg-container h1 {
    color: #ffffff;
    margin-bottom: 8px;
    font-size: 1.75rem;
    font-weight: bold;
    text-align: center;
}

.desc {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
    margin-bottom: 32px;
    text-align: center;
    line-height: 1.5;
}

label {
    display: block;
    margin-bottom: 6px;
    font-weight: bold;
    color: #ffffff;
    font-size: 0.875rem;
}

input[type="text"], input[type="password"], input[type="email"] {
    width: 100%;
    padding: 12px;
    margin-bottom: 20px;
    border-radius: 4px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    font-size: 1rem;
    font-family: 'Courier New', monospace;
    transition: border-color 0.2s;
}

input[type="text"]:focus, input[type="password"]:focus, input[type="email"]:focus {
    outline: none;
    border-color: #ff4500;
}

input[type="text"]::placeholder, input[type="password"]::placeholder, input[type="email"]::placeholder {
    color: rgba(255, 255, 255, 0.6);
}

.btn-submit {
    width: 100%;
    background: #ff4500;
    color: #ffffff;
    border: 2px solid #ff4500;
    padding: 14px;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    cursor: pointer;
    margin-top: 8px;
    transition: background-color 0.2s;
}

.btn-submit:hover {
    background: #ff6600;
    border-color: #ff6600;
}

.btn-submit:disabled {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
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
    .reg-container {
        padding: 30px 25px;
        max-width: 100%;
        margin-top: 1rem;
    }
    
    .reg-container h1 {
        font-size: 1.6rem;
    }
    
    .desc {
        font-size: 0.85rem;
        margin-bottom: 25px;
    }
    
    input[type="text"], input[type="password"], input[type="email"] {
        padding: 14px;
        font-size: 16px; /* Prevents zoom on iOS */
    }
    
    .btn-submit {
        padding: 16px;
        font-size: 1rem;
    }
}

@media (max-width: 480px) {
    .reg-container {
        padding: 20px;
        margin: 0;
        margin-top: 1rem;
    }
    
    .reg-container h1 {
        font-size: 1.4rem;
    }
    
    .desc {
        font-size: 0.8rem;
        line-height: 1.4;
    }
    
    label {
        font-size: 0.8rem;
    }
    
    input[type="text"], input[type="password"], input[type="email"] {
        padding: 12px;
        margin-bottom: 15px;
    }
    
    .btn-submit {
        padding: 14px;
        font-size: 0.9rem;
    }
}
@endsection

@section('content')
<div class="reg-container">
    <h1>Register for h2ktalk.fun</h1>
    <div class="desc">
        Create your account to join chat rooms and connect with others.<br>
        <b>Do not use your real Paltalk credentials.</b>
    </div>
    
    <form id="regForm" autocomplete="off" aria-label="Account registration form">
        <div id="formError" class="error" style="display:none;" role="alert" aria-live="assertive"></div>
        <div id="formSuccess" class="success" style="display:none;" role="status" aria-live="polite"></div>
        
        <label for="first">First Name</label>
        <input type="text" id="first" name="first" maxlength="32" required autocomplete="given-name">
        
        <label for="last">Last Name</label>
        <input type="text" id="last" name="last" maxlength="32" required autocomplete="family-name">
        
        <label for="nickname">Nickname</label>
        <input type="text" id="nickname" name="nickname" maxlength="32" required autocomplete="username">
        <small style="color: rgba(255, 255, 255, 0.7); font-size: 0.8rem; margin-top: -15px; display: block; margin-bottom: 15px;">
            Must be 5+ characters, no brackets, and cannot contain: admin, co-admin, paltalk, support, palsupport
        </small>
        
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" maxlength="255" placeholder="your@email.com" autocomplete="email">
        <small style="color: rgba(255, 255, 255, 0.7); font-size: 0.8rem; margin-top: -15px; display: block; margin-bottom: 15px;">
            Optional - for account recovery and notifications
        </small>
        
        <label for="password">Password</label>
        <input type="password" id="password" name="password" maxlength="64" required autocomplete="new-password">
        
        <button type="submit" class="btn-submit">Register</button>
    </form>
    
    <div class="back-link">
        <a href="{{ route('home') }}">← Back to Home</a>
    </div>
</div>
@endsection

@section('scripts')
const form = document.getElementById('regForm');
const errorDiv = document.getElementById('formError');
const successDiv = document.getElementById('formSuccess');
const nicknameInput = document.getElementById('nickname');
let nicknameCheckTimeout;

// Check if nickname exists
async function checkNicknameExists(nickname) {
    try {
        const res = await fetch('/api/check-nickname', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token
            },
            body: JSON.stringify({ nickname })
        });
        const data = await res.json();
        return data.exists;
    } catch (err) {
        return false; // Assume available if check fails
    }
}

// Real-time nickname validation
nicknameInput.addEventListener('input', () => {
    clearTimeout(nicknameCheckTimeout);
    const nickname = nicknameInput.value.trim();
    
    // Quick validation checks
    if (nickname.length > 0 && nickname.length < 5) {
        showError(errorDiv, 'Nickname must be at least 5 characters long.');
        hideMessage(successDiv);
        return;
    }
    
    // Check for blacklisted words
    if (nickname.length >= 5) {
        const blacklistedWords = ['admin', 'co-admin', 'coadmin', 'paltalk', 'support', 'palsupport'];
        const nicknameLC = nickname.toLowerCase();
        
        for (const word of blacklistedWords) {
            if (nicknameLC.includes(word)) {
                showError(errorDiv, `Nickname cannot contain the word "${word}".`);
                hideMessage(successDiv);
                return;
            }
        }
        
        // Check for brackets
        if (nickname.includes('(') || nickname.includes(')')) {
            showError(errorDiv, 'Nickname cannot contain brackets ( ).');
            hideMessage(successDiv);
            return;
        }
        
        // Check if already taken
        nicknameCheckTimeout = setTimeout(async () => {
            const exists = await checkNicknameExists(nickname);
            if (exists) {
                showError(errorDiv, 'This nickname is already taken. Please choose another.');
                hideMessage(successDiv);
            } else {
                hideMessage(errorDiv);
            }
        }, 500);
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage(errorDiv);
    hideMessage(successDiv);
    
    const first = form.first.value.trim();
    const last = form.last.value.trim();
    const nickname = form.nickname.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    
    if (!first || !last || !nickname || !password) {
        showError(errorDiv, 'All fields are required.');
        return;
    }

    // Validate nickname format
    if (nickname.length < 5) {
        showError(errorDiv, 'Nickname must be at least 5 characters long.');
        return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) {
        showError(errorDiv, 'Nickname can only contain letters, numbers, hyphens, and underscores.');
        return;
    }
    
    // Check for blacklisted words
    const blacklistedWords = ['admin', 'co-admin', 'coadmin', 'paltalk', 'support', 'palsupport'];
    const nicknameLC = nickname.toLowerCase();
    
    for (const word of blacklistedWords) {
        if (nicknameLC.includes(word)) {
            showError(errorDiv, `Nickname cannot contain the word "${word}".`);
            return;
        }
    }
    
    // Check for brackets
    if (nickname.includes('(') || nickname.includes(')')) {
        showError(errorDiv, 'Nickname cannot contain brackets ( ).');
        return;
    }

    // Final nickname availability check
    const exists = await checkNicknameExists(nickname);
    if (exists) {
        showError(errorDiv, 'This nickname is already taken. Please choose another.');
        return;
    }
    
    // Disable submit button
    const submitBtn = form.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';
    
    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token
            },
            body: JSON.stringify({ 
                first_name: first, 
                last_name: last, 
                nickname,
                email: email || null,
                password 
            })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            showSuccess(successDiv, data.message || 'Registration successful! You can now log in.');
            hideMessage(errorDiv);
            form.reset();
        } else {
            showError(errorDiv, data.error || 'Registration failed.');
            hideMessage(successDiv);
        }
    } catch (err) {
        showError(errorDiv, 'Server error. Please try again later.');
        hideMessage(successDiv);
        console.error('Registration error:', err);
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// Clear error messages when user starts typing in any field
['first', 'last', 'nickname', 'email', 'password'].forEach(fieldName => {
    document.getElementById(fieldName).addEventListener('input', () => {
        if (fieldName !== 'nickname') { // Don't clear nickname-specific errors immediately
            hideMessage(errorDiv);
        }
        hideMessage(successDiv);
    });
});
@endsection