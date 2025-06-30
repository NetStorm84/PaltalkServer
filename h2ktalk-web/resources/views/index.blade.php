@extends('layouts.app')

@section('title', 'h2ktalk.fun - Classic Paltalk Community Chat Server | Retro 2002 Experience')

@section('styles')
.hero {
    text-align: center;
    padding: 3rem 0;
}

.hero h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    line-height: 1.2;
}

.hero p {
    font-size: 1.1rem;
    margin-bottom: 2rem;
    opacity: 0.9;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
}

.cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 3rem;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin: 3rem 0;
}

.feature {
    background: rgba(255, 255, 255, 0.05);
    padding: 2rem;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.feature h3 {
    font-size: 1.3rem;
    margin-bottom: 1rem;
    color: #ffffff;
}

.feature p {
    opacity: 0.9;
    line-height: 1.6;
}

.info-section {
    background: rgba(255, 255, 255, 0.05);
    padding: 2rem;
    border-radius: 4px;
    margin: 2rem 0;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.info-section h2 {
    margin-bottom: 1rem;
    color: #ffffff;
}

.info-section p {
    opacity: 0.9;
    line-height: 1.6;
    margin-bottom: 1rem;
}

.warning {
    background: rgba(255, 69, 0, 0.1);
    border: 1px solid #ff4500;
    padding: 1rem;
    border-radius: 4px;
    margin: 1rem 0;
}

.warning strong {
    color: #ff4500;
}

.screenshots-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
}

.screenshot-placeholder {
    background: rgba(255, 255, 255, 0.1);
    border: 2px dashed rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    padding: 2rem 1rem;
    text-align: center;
    transition: border-color 0.3s ease;
}

.screenshot-placeholder:hover {
    border-color: #ff4500;
}

.screenshot-text {
    font-size: 1.1rem;
    font-weight: bold;
    color: #ff4500;
    margin-bottom: 0.5rem;
}

.github-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.github-section h3 {
    margin-bottom: 0.75rem;
    color: #ffffff;
}

.github-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    max-width: 200px;
    background: transparent;
    border: 2px solid #ffffff;
}

.notify-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.notify-form {
    margin-top: 1rem;
}

.notify-input-group {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.notify-input-group input[type="email"] {
    flex: 1;
    padding: 12px 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    font-family: 'Courier New', monospace;
    font-size: 1rem;
    transition: border-color 0.2s;
}

.notify-input-group input[type="email"]:focus {
    outline: none;
    border-color: #ff4500;
}

.notify-input-group input[type="email"]::placeholder {
    color: rgba(255, 255, 255, 0.6);
}

.notify-btn {
    padding: 12px 24px;
    background: #ff4500;
    border: 2px solid #ff4500;
    white-space: nowrap;
    min-width: auto;
    max-width: none;
}

.notify-btn:hover {
    background: #ff6600;
    border-color: #ff6600;
    color: #ffffff;
}

@media (max-width: 768px) {
    .hero h1 {
        font-size: 1.8rem;
        line-height: 1.3;
    }

    .hero p {
        font-size: 1rem;
    }

    .cta-buttons {
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
    }

    .features {
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }

    .feature {
        padding: 1.5rem;
    }

    .info-section {
        padding: 1.5rem;
        margin: 1.5rem 0;
    }

    .screenshots-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .notify-input-group {
        flex-direction: column;
        gap: 0.75rem;
    }

    .notify-btn {
        width: 100%;
    }
}
@endsection

@section('content')
<section class="hero" role="banner">
    <h1>Welcome to the Nostalgic World of Paltalk</h1>
    <p>Experience the classic Paltalk chat rooms with our community-driven server. Connect with friends, join voice chats, and be part of a vibrant online community.</p>
    
    <div class="cta-buttons">
        <a href="{{ route('register') }}" class="btn btn-primary">
            📝 Register Account
        </a>
        <a href="{{ route('download') }}" class="btn">
            💾 Download Original 2002 Client
        </a>
    </div>
</section>

<section class="features" aria-labelledby="features-heading">
    <h2 id="features-heading" style="display: none;">Key Features</h2>
    <article class="feature">
        <h3>🎙️ Voice Chat Rooms</h3>
        <p>Join live voice conversations with multiple participants. Experience the classic Paltalk voice chat experience with crystal clear audio.</p>
    </article>
    
    <article class="feature">
        <h3>💬 Text Chat</h3>
        <p>Engage in real-time text conversations. Share thoughts, links, and connect with people from around the world.</p>
    </article>
    
    <article class="feature">
        <h3>🏠 Multiple Rooms</h3>
        <p>Explore hundreds of themed chat rooms covering various topics, interests, and communities. Find your perfect chat environment.</p>
    </article>
    
    <article class="feature">
        <h3>👥 Community Driven</h3>
        <p>Built by the community, for the community. This is a non-commercial project dedicated to preserving the classic Paltalk experience.</p>
    </article>
</section>

<section class="info-section">
    <h2>🚀 Getting Started</h2>
    <p><strong>1. Register:</strong> Create your account using the registration form. Choose a unique nickname and set a secure password.</p>
    <p><strong>2. Download Client:</strong> Download the original Paltalk client from 2002 - the authentic retro experience!</p>
    <p><strong>3. Connect & Chat:</strong> Launch the client, log in with your credentials, and start exploring the chat rooms just like it's 2002!</p>
    
    <div class="warning">
        <strong>⚠️ Important:</strong> This is a community server project and is not affiliated with the official Paltalk service. Do not use your real Paltalk credentials here. Create a new account specifically for this server.
    </div>
</section>

<section class="info-section">
    <h2>📸 Screenshots</h2>
    <div class="screenshots-grid">
        <div class="screenshot-placeholder">
            <div class="screenshot-text">Classic Room List</div>
            <p>Browse hundreds of themed chat rooms just like in 2002</p>
        </div>
        <div class="screenshot-placeholder">
            <div class="screenshot-text">Voice Chat Interface</div>
            <p>Original voice chat experience with push-to-talk and room controls</p>
        </div>
        <div class="screenshot-placeholder">
            <div class="screenshot-text">Chat Window</div>
            <p>Classic text chat interface with user lists and emoticons</p>
        </div>
        <div class="screenshot-placeholder">
            <div class="screenshot-text">User Profiles</div>
            <p>View profiles and connect with other community members</p>
        </div>
    </div>
</section>

<section class="info-section">
    <h2>⚠️ Development Status</h2>
    <p><strong>This is an active development project.</strong> Not all features from the original 2002 Paltalk client are fully implemented yet. We're working hard to recreate the authentic experience, but some functionality may be missing or incomplete.</p>
    
    <div class="github-section">
        <h3>🛠️ Want to Help?</h3>
        <p>This is an open-source community project! Developers, testers, and enthusiasts are welcome to contribute.</p>
        <a href="https://github.com/NetStorm84/PaltalkServer" target="_blank" class="btn github-btn">
            🔗 View on GitHub
        </a>
    </div>
    
    <div class="notify-section">
        <h3>📧 Stay Updated</h3>
        <p>Get notified when new features are added or when the server is feature-complete!</p>
        <form id="notifyForm" class="notify-form" aria-label="Email notification signup">
            <div id="notifyMessage" class="success" style="display: none;" role="status" aria-live="polite"></div>
            <div id="notifyError" class="error" style="display: none;" role="alert" aria-live="assertive"></div>
            <div class="notify-input-group">
                <input type="email" id="notifyEmail" placeholder="Enter your email address" required>
                <button type="submit" class="btn notify-btn">Notify Me</button>
            </div>
        </form>
    </div>
</section>
@endsection

@section('scripts')
// Email notification form handling
const notifyForm = document.getElementById('notifyForm');
const notifyMessage = document.getElementById('notifyMessage');
const notifyError = document.getElementById('notifyError');

if (notifyForm) {
    notifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('notifyEmail').value.trim();
        
        if (!email) {
            showError(notifyError, 'Please enter a valid email address.');
            hideMessage(notifyMessage);
            return;
        }
        
        // Disable form during submission
        const submitBtn = notifyForm.querySelector('.notify-btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Subscribing...';
        
        try {
            const response = await fetch('/api/notify-signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token
                },
                body: JSON.stringify({ email: email })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                showSuccess(notifyMessage, data.message || 'Thanks! You\'ll be notified when we have updates.');
                hideMessage(notifyError);
                notifyForm.reset();
            } else {
                showError(notifyError, data.error || 'Failed to subscribe. Please try again.');
                hideMessage(notifyMessage);
            }
        } catch (error) {
            showError(notifyError, 'Network error. Please check your connection and try again.');
            hideMessage(notifyMessage);
            console.error('Email notification signup error:', error);
        } finally {
            // Re-enable form
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}
@endsection