@extends('layouts.app')

@section('title', 'Create Free Account - h2ktalk Voice & Video Chat')

@section('description', 'Create your free h2ktalk account in under 60 seconds. No credit cards, no premium tiers, no hidden fees. Start unlimited voice & video chat on Windows and Mac.')

@section('keywords', 'create chat account, free registration, voice chat signup, video chat account, no credit card required, free messaging app, chat app registration')

@section('og_title', 'Create Free h2ktalk Account - Unlimited Voice & Video Chat')
@section('og_description', 'Sign up for h2ktalk in under 60 seconds. No credit cards, no hidden fees. Get unlimited voice & video chat, custom rooms, and more.')

@section('twitter_title', 'Create Free h2ktalk Account - Unlimited Voice & Video Chat')
@section('twitter_description', 'Sign up for h2ktalk in under 60 seconds. No credit cards, no hidden fees. Unlimited features forever.')

@section('content')
<!-- Registration Section -->
<section class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white py-20">
    <!-- Background decoration -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(120,119,198,0.3),transparent_50%),radial-gradient(circle_at_70%_70%,rgba(75,85,99,0.3),transparent_50%)]"></div>
    
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
            <!-- Left side - Info -->
            <div class="space-y-8">
                <div>
                    <h1 class="text-4xl lg:text-5xl font-black leading-tight mb-6">
                        Join the <span class="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Revolution</span>
                    </h1>
                    <p class="text-xl lg:text-2xl text-blue-100 leading-relaxed">
                        Create your account and experience chat without the corporate nonsense. No ads, no premium tiers, no hidden costs.
                    </p>
                </div>
                
                <!-- Features Preview -->
                <div class="space-y-4">
                    <div class="flex items-center gap-4">
                        <div class="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <span class="text-lg font-medium">Unlimited voice & video chat</span>
                    </div>
                    
                    <div class="flex items-center gap-4">
                        <div class="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <span class="text-lg font-medium">Any nickname color you want</span>
                    </div>
                    
                    <div class="flex items-center gap-4">
                        <div class="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <span class="text-lg font-medium">Create and manage rooms</span>
                    </div>
                    
                    <div class="flex items-center gap-4">
                        <div class="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <span class="text-lg font-medium">Zero ads or interruptions</span>
                    </div>
                    
                    <div class="flex items-center gap-4">
                        <div class="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <span class="text-lg font-medium">Privacy-focused design</span>
                    </div>
                    
                    <div class="flex items-center gap-4">
                        <div class="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <span class="text-lg font-medium">Available on Windows & Mac</span>
                    </div>
                </div>
            </div>
            
            <!-- Right side - Form -->
            <div class="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div class="text-center mb-8">
                    <h2 class="text-3xl font-bold text-white mb-2">Create Account</h2>
                    <p class="text-blue-100">Takes less than a minute</p>
                </div>
                
                <form id="regForm" class="space-y-6" autocomplete="off">
                    <div id="formError" class="hidden p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200" role="alert"></div>
                    <div id="formSuccess" class="hidden p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-200" role="status"></div>
                    
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label for="first" class="block text-sm font-semibold text-white mb-2">First Name</label>
                            <input type="text" id="first" name="first" class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent backdrop-blur-sm" maxlength="32" required autocomplete="given-name" placeholder="John">
                        </div>
                        
                        <div>
                            <label for="last" class="block text-sm font-semibold text-white mb-2">Last Name</label>
                            <input type="text" id="last" name="last" class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent backdrop-blur-sm" maxlength="32" required autocomplete="family-name" placeholder="Doe">
                        </div>
                    </div>
                    
                    <div>
                        <label for="nickname" class="block text-sm font-semibold text-white mb-2">Choose Nickname</label>
                        <input type="text" id="nickname" name="nickname" class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent backdrop-blur-sm" maxlength="32" required autocomplete="username" placeholder="cooluser123">
                        <span class="block mt-2 text-sm text-blue-200">
                            5+ characters • Pick any color you want!
                        </span>
                    </div>
                    
                    <div>
                        <label for="email" class="block text-sm font-semibold text-white mb-2">Email (Optional)</label>
                        <input type="email" id="email" name="email" class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent backdrop-blur-sm" maxlength="255" placeholder="john@example.com" autocomplete="email">
                        <span class="block mt-2 text-sm text-blue-200">
                            For account recovery only • No spam, ever
                        </span>
                    </div>
                    
                    <div>
                        <label for="password" class="block text-sm font-semibold text-white mb-2">Password</label>
                        <input type="password" id="password" name="password" class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent backdrop-blur-sm" maxlength="64" required autocomplete="new-password" placeholder="Create a strong password">
                    </div>
                    
                    <button type="submit" class="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-xl hover:shadow-2xl">
                        Create Account
                    </button>
                </form>
                
                <!-- Footer -->
                <div class="text-center mt-8 pt-8 border-t border-white/20">
                    <p class="text-blue-200">Already have an account? <a href="{{ route('download') }}" class="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">Download</a></p>
                </div>
                
                <!-- Trust Indicators -->
                <div class="flex justify-center gap-8 mt-8 pt-8 border-t border-white/20">
                    <div class="text-center">
                        <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="text-sm font-medium text-blue-200">Secure</div>
                    </div>
                    
                    <div class="text-center">
                        <div class="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="text-sm font-medium text-blue-200">No Spam</div>
                    </div>
                    
                    <div class="text-center">
                        <div class="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="text-sm font-medium text-blue-200">Instant</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
@endsection

@section('scripts')
const form = document.getElementById('regForm');
const errorDiv = document.getElementById('formError');
const successDiv = document.getElementById('formSuccess');
const nicknameInput = document.getElementById('nickname');
const submitBtn = form.querySelector('button[type="submit"]');
let nicknameCheckTimeout;

// Nickname validation
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
        return false;
    }
}

// Real-time nickname validation
nicknameInput.addEventListener('input', () => {
    clearTimeout(nicknameCheckTimeout);
    const nickname = nicknameInput.value.trim();
    const hintElement = nicknameInput.nextElementSibling;
    
    if (nickname.length > 0 && nickname.length < 5) {
        hintElement.textContent = 'Nickname must be at least 5 characters';
        hintElement.classList.add('text-red-400');
        hintElement.classList.remove('text-green-400', 'text-blue-200');
        return;
    }
    
    if (nickname.length >= 5) {
        const blacklistedWords = ['admin', 'co-admin', 'coadmin', 'support'];
        const nicknameLC = nickname.toLowerCase();
        
        for (const word of blacklistedWords) {
            if (nicknameLC.includes(word)) {
                hintElement.textContent = `Nickname cannot contain "${word}"`;
                hintElement.classList.add('text-red-400');
                hintElement.classList.remove('text-green-400', 'text-blue-200');
                return;
            }
        }
        
        if (nickname.includes('(') || nickname.includes(')')) {
            hintElement.textContent = 'Nickname cannot contain brackets';
            hintElement.classList.add('text-red-400');
            hintElement.classList.remove('text-green-400', 'text-blue-200');
            return;
        }
        
        hintElement.textContent = 'Checking availability...';
        hintElement.classList.remove('text-red-400', 'text-green-400');
        hintElement.classList.add('text-blue-200');
        
        nicknameCheckTimeout = setTimeout(async () => {
            const exists = await checkNicknameExists(nickname);
            if (exists) {
                hintElement.textContent = 'This nickname is taken. Try another!';
                hintElement.classList.add('text-red-400');
                hintElement.classList.remove('text-green-400', 'text-blue-200');
            } else {
                hintElement.textContent = '✓ Perfect! This nickname is available';
                hintElement.classList.add('text-green-400');
                hintElement.classList.remove('text-red-400', 'text-blue-200');
            }
        }, 500);
    } else {
        hintElement.textContent = '5+ characters • Pick any color you want!';
        hintElement.classList.remove('text-red-400', 'text-green-400');
        hintElement.classList.add('text-blue-200');
    }
});

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    const first = form.first.value.trim();
    const last = form.last.value.trim();
    const nickname = form.nickname.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    
    if (!first || !last || !nickname || !password) {
        errorDiv.textContent = 'Please fill in all required fields';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (nickname.length < 5) {
        errorDiv.textContent = 'Nickname must be at least 5 characters';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) {
        errorDiv.textContent = 'Nickname can only contain letters, numbers, hyphens, and underscores';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    const blacklistedWords = ['admin', 'co-admin', 'coadmin', 'support'];
    const nicknameLC = nickname.toLowerCase();
    
    for (const word of blacklistedWords) {
        if (nicknameLC.includes(word)) {
            errorDiv.textContent = `Nickname cannot contain "${word}"`;
            errorDiv.classList.remove('hidden');
            return;
        }
    }
    
    if (nickname.includes('(') || nickname.includes(')')) {
        errorDiv.textContent = 'Nickname cannot contain brackets';
        errorDiv.classList.remove('hidden');
        return;
    }

    const exists = await checkNicknameExists(nickname);
    if (exists) {
        errorDiv.textContent = 'This nickname is already taken';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Creating account...';
    
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
            successDiv.textContent = '🎉 Account created! Redirecting to download page...';
            successDiv.classList.remove('hidden');
            errorDiv.classList.add('hidden');
            
            // Track successful registration
            if (typeof trackRegistration === 'function') {
                trackRegistration('success');
            }
            
            form.reset();
            
            setTimeout(() => {
                window.location.href = '{{ route("download") }}';
            }, 2000);
        } else {
            errorDiv.textContent = data.error || 'Registration failed. Please try again.';
            errorDiv.classList.remove('hidden');
            successDiv.classList.add('hidden');
            
            // Track failed registration
            if (typeof trackRegistration === 'function') {
                trackRegistration('failed');
            }
        }
    } catch (err) {
        errorDiv.textContent = 'Connection error. Please check your internet and try again.';
        errorDiv.classList.remove('hidden');
        successDiv.classList.add('hidden');
        console.error('Registration error:', err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});

// Clear errors on input
['first', 'last', 'email', 'password'].forEach(fieldName => {
    document.getElementById(fieldName).addEventListener('input', () => {
        if (fieldName !== 'nickname') {
            errorDiv.classList.add('hidden');
        }
        successDiv.classList.add('hidden');
    });
});
@endsection