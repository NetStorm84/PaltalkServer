@extends('layouts.app')

@section('title', 'h2ktalk - Free Voice & Video Chat App | No Ads, Unlimited Features')

@section('description', 'Download h2ktalk for free - unlimited voice & video chat with no ads, no premium fees, and no virtual currencies. Create chat rooms, customize colors, and connect with friends on Windows and Mac.')

@section('keywords', 'free chat app, voice chat, video chat, no ads, chat rooms, Windows chat, Mac chat, unlimited chat, ad-free messaging, free video calling, community chat, paltalk alternative, discord alternative')

@section('og_title', 'h2ktalk - Free Voice & Video Chat App with Unlimited Features')
@section('og_description', 'Experience chat without corporate greed. Unlimited voice & video chat, custom rooms, any nickname color - all free forever. Available for Windows and Mac.')

@section('twitter_title', 'h2ktalk - Free Voice & Video Chat App | No Ads, Unlimited Features')
@section('twitter_description', 'Chat without corporate BS. Unlimited voice & video, custom rooms, any colors - all free forever. Download for Windows & Mac.')

@section('content')
<!-- Hero Section -->
<section class="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(120,119,198,0.3),transparent_50%),radial-gradient(circle_at_70%_70%,rgba(75,85,99,0.3),transparent_50%)]"></div>
    
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
            <!-- Hero Text -->
            <div class="space-y-8">
                <h1 class="text-5xl lg:text-6xl font-black leading-tight">
                    Free Voice & Video Chat
                    <span class="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        Without Limits
                    </span>
                </h1>
                
                <p class="text-xl lg:text-2xl text-blue-100 leading-relaxed">
                    Unlimited voice & video chat with HD quality. Create custom chat rooms, choose any nickname color, and connect with friends across Windows and Mac - completely free forever.
                </p>
                
                <!-- CTA Buttons -->
                <div class="flex flex-col sm:flex-row gap-4">
                    <a href="{{ route('download') }}" onclick="if(typeof trackDownload === 'function') trackDownload('hero_button')" class="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-xl hover:shadow-2xl">
                        Download Now
                    </a>
                    <a href="{{ route('register') }}" onclick="if(typeof trackEvent === 'function') trackEvent('register_click', 'conversion', 'hero_button')" class="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200">
                        Create Account
                    </a>
                </div>
                
                <!-- Platform Badges -->
                <div class="flex flex-wrap gap-3 pt-4">
                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                        🪟 Available on Windows
                    </div>
                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                        🍎 Available on Mac
                    </div>
                    <div class="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                        🚀 Native Performance
                    </div>
                </div>
            </div>
            
            <!-- Hero Visual -->
            <div class="relative h-96 lg:h-[500px]">
                <div class="absolute inset-0" style="perspective: 1000px;">
                    <!-- Main screenshot -->
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-60 bg-white rounded-2xl shadow-2xl z-30" style="transform: rotateY(-15deg) rotateX(5deg);">
                        <div class="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                            <div class="text-white text-center">
                                <div class="text-2xl font-bold mb-2">Main Chat Interface</div>
                                <div class="text-sm opacity-75">Crystal clear conversations</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Background screenshots -->
                    <div class="absolute top-[20%] left-0 w-64 h-48 bg-white rounded-xl shadow-xl opacity-80 z-10" style="transform: rotateY(25deg) rotateX(-10deg);">
                        <div class="w-full h-full bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                            <div class="text-white text-center">
                                <div class="text-lg font-semibold mb-1">Voice & Video</div>
                                <div class="text-xs opacity-75">HD quality</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="absolute top-[30%] right-0 w-64 h-48 bg-white rounded-xl shadow-xl opacity-80 z-20" style="transform: rotateY(-25deg) rotateX(-10deg);">
                        <div class="w-full h-full bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
                            <div class="text-white text-center">
                                <div class="text-lg font-semibold mb-1">Room Browser</div>
                                <div class="text-xs opacity-75">Find your community</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Features Section -->
<section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
            <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Everything You Need, Nothing You Don't
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                Built for humans, not shareholders
            </p>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <!-- Feature Cards -->
            <div class="group bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-2">
                <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zM3 15a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1zm5-1a1 1 0 011-1h1a1 1 0 011 1v3a1 1 0 01-1 1H9a1 1 0 01-1-1v-3zm5-1a1 1 0 011-1h1a1 1 0 011 1v5a1 1 0 01-1 1h-1a1 1 0 01-1-1v-5z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-3">Any Color You Want</h3>
                <p class="text-gray-600">Choose any nickname color. No premium colors, no paid customization. Express yourself without opening your wallet.</p>
            </div>
            
            <div class="group bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-2">
                <div class="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-3">Zero Monetization</h3>
                <p class="text-gray-600">No ads, no popups, no virtual gifts, no super chats, no premium tiers. Just pure, uninterrupted conversation.</p>
            </div>
            
            <div class="group bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-2">
                <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12c0-1.636-.492-3.154-1.343-4.243a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-3">Premium Quality Audio</h3>
                <p class="text-gray-600">High-quality voice and video for everyone. No "upgrade for HD" nonsense. Everyone gets the best experience.</p>
            </div>
            
            <div class="group bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-2">
                <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-3">Native Desktop Apps</h3>
                <p class="text-gray-600">Real applications for Windows and Mac. Not some wrapped web app. Built for performance and reliability.</p>
            </div>
            
            <div class="group bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-2">
                <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-3">Privacy Focused</h3>
                <p class="text-gray-600">Minimal data collection. No selling your data to advertisers. Your conversations are yours.</p>
            </div>
            
            <div class="group bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-2">
                <div class="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-3">Community Driven</h3>
                <p class="text-gray-600">Built by people who miss when the internet wasn't trying to extract value from every interaction.</p>
            </div>
        </div>
    </div>
</section>

<!-- Chat Rooms Section -->
<section class="py-20 bg-gradient-to-br from-indigo-50 to-blue-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
            <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Discover Your Community
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                Join topic-based rooms, create your own spaces, and connect through voice and video
            </p>
        </div>
        
        <div class="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <!-- Room Features -->
            <div class="space-y-8">
                <div class="flex gap-6 group">
                    <div class="flex-shrink-0">
                        <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-3">Topic-Based Rooms</h3>
                        <p class="text-gray-600 text-lg leading-relaxed">Browse hundreds of rooms organized by interests - from gaming and music to tech and hobbies. Find your tribe instantly.</p>
                    </div>
                </div>
                
                <div class="flex gap-6 group">
                    <div class="flex-shrink-0">
                        <div class="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-3">Create Your Own</h3>
                        <p class="text-gray-600 text-lg leading-relaxed">Build your own community space. Set the topic, customize the rules, and become the room admin. Your space, your rules.</p>
                    </div>
                </div>
                
                <div class="flex gap-6 group">
                    <div class="flex-shrink-0">
                        <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12c0-1.636-.492-3.154-1.343-4.243a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                <path fill-rule="evenodd" d="M13.828 8.172a1 1 0 011.414 0A5.983 5.983 0 0117 12a5.983 5.983 0 01-1.758 3.828 1 1 0 01-1.414-1.414A3.987 3.987 0 0015 12a3.987 3.987 0 00-1.172-2.828 1 1 0 010-1.414z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-3">Crystal Clear Voice</h3>
                        <p class="text-gray-600 text-lg leading-relaxed">High-quality voice chat with noise cancellation. Talk naturally with friends without worrying about audio quality.</p>
                    </div>
                </div>
                
                <div class="flex gap-6 group">
                    <div class="flex-shrink-0">
                        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-3">HD Video Calls</h3>
                        <p class="text-gray-600 text-lg leading-relaxed">See your friends in crisp HD video. Multiple participants, screen sharing, and smooth performance on any device.</p>
                    </div>
                </div>
            </div>
            
            <!-- Room Browser Mockup -->
            <div class="relative">
                <div class="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
                    <!-- Header -->
                    <div class="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
                        <h4 class="text-white font-semibold text-lg">Room Browser</h4>
                    </div>
                    
                    <!-- Room List -->
                    <div class="p-6 space-y-4">
                        <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            <div class="flex-1">
                                <div class="font-semibold text-gray-900">🎮 Gaming Central</div>
                                <div class="text-sm text-gray-600">247 people • Latest games discussion</div>
                            </div>
                            <div class="text-sm text-gray-500">🔊 🎥</div>
                        </div>
                        
                        <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            <div class="flex-1">
                                <div class="font-semibold text-gray-900">🎵 Music Lovers</div>
                                <div class="text-sm text-gray-600">89 people • Share your favorite tracks</div>
                            </div>
                            <div class="text-sm text-gray-500">🔊</div>
                        </div>
                        
                        <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            <div class="flex-1">
                                <div class="font-semibold text-gray-900">💻 Tech Talk</div>
                                <div class="text-sm text-gray-600">156 people • Programming & gadgets</div>
                            </div>
                            <div class="text-sm text-gray-500">🔊 🎥</div>
                        </div>
                        
                        <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                            <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <div class="flex-1">
                                <div class="font-semibold text-gray-900">🏠 Home & Garden</div>
                                <div class="text-sm text-gray-600">43 people • DIY tips and inspiration</div>
                            </div>
                            <div class="text-sm text-gray-500">🔊</div>
                        </div>
                        
                        <div class="flex items-center gap-4 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
                            <div class="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <div class="flex-1">
                                <div class="font-semibold text-indigo-900">Create New Room</div>
                                <div class="text-sm text-indigo-600">Start your own community</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Floating elements -->
                <div class="absolute -top-4 -right-4 bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg transform rotate-3">
                    <div class="text-sm font-semibold">500+ Active Rooms</div>
                </div>
                
                <div class="absolute -bottom-4 -left-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl shadow-lg transform -rotate-3">
                    <div class="text-sm font-semibold">No Room Limits</div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Screenshots Section -->
<section class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
            <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                See It In Action
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                Clean interfaces designed for conversation, not conversion
            </p>
        </div>
        
        <div class="grid md:grid-cols-2 gap-8">
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group">
                <div class="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <div class="text-white text-center">
                        <div class="text-2xl font-bold mb-2">Windows Client</div>
                        <div class="text-sm opacity-75">Native Windows Experience</div>
                    </div>
                </div>
                <div class="p-6">
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">Windows Client</h3>
                    <p class="text-gray-600">Native Windows application with familiar interface and modern performance</p>
                </div>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group">
                <div class="h-48 bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <div class="text-white text-center">
                        <div class="text-2xl font-bold mb-2">Mac Client</div>
                        <div class="text-sm opacity-75">Beautiful Mac Experience</div>
                    </div>
                </div>
                <div class="p-6">
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">Mac Client</h3>
                    <p class="text-gray-600">Beautiful Mac app that feels at home on macOS with full feature parity</p>
                </div>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group">
                <div class="h-48 bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                    <div class="text-white text-center">
                        <div class="text-2xl font-bold mb-2">Video Chat</div>
                        <div class="text-sm opacity-75">Crystal Clear Quality</div>
                    </div>
                </div>
                <div class="p-6">
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">Video & Voice Chat</h3>
                    <p class="text-gray-600">Crystal clear video and audio quality without premium subscriptions</p>
                </div>
            </div>
            
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group">
                <div class="h-48 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <div class="text-white text-center">
                        <div class="text-2xl font-bold mb-2">Room Management</div>
                        <div class="text-sm opacity-75">Full Control</div>
                    </div>
                </div>
                <div class="p-6">
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">Room Management</h3>
                    <p class="text-gray-600">Create and customize your own chat rooms with full administrative control</p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Comparison Section -->
<section class="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
            <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Why We're Different
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                A side-by-side comparison with the corporate competition
            </p>
        </div>
        
        <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <!-- Them Column -->
            <div class="group relative">
                <!-- Background decoration -->
                <div class="absolute inset-0 bg-gradient-to-br from-red-100 to-red-200 rounded-3xl transform rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                
                <div class="relative bg-white border-2 border-red-200 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <!-- Header with icon -->
                    <div class="flex items-center justify-center mb-8">
                        <div class="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-2xl shadow-lg">
                            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                    
                    <h3 class="text-3xl font-black text-center mb-2 bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                        Corporate Chat Apps
                    </h3>
                    <p class="text-center text-red-600 font-semibold mb-8">The profit-first approach</p>
                    
                    <ul class="space-y-4">
                        <li class="flex items-start gap-4 p-3 rounded-xl bg-red-50 border border-red-100">
                            <div class="bg-red-500 rounded-full p-1 mt-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="text-gray-800 font-medium">Ads interrupting conversations</span>
                        </li>
                        <li class="flex items-start gap-4 p-3 rounded-xl bg-red-50 border border-red-100">
                            <div class="bg-red-500 rounded-full p-1 mt-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="text-gray-800 font-medium">Premium colors cost money</span>
                        </li>
                        <li class="flex items-start gap-4 p-3 rounded-xl bg-red-50 border border-red-100">
                            <div class="bg-red-500 rounded-full p-1 mt-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="text-gray-800 font-medium">Virtual gift economy</span>
                        </li>
                        <li class="flex items-start gap-4 p-3 rounded-xl bg-red-50 border border-red-100">
                            <div class="bg-red-500 rounded-full p-1 mt-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="text-gray-800 font-medium">Constant upselling popups</span>
                        </li>
                        <li class="flex items-start gap-4 p-3 rounded-xl bg-red-50 border border-red-100">
                            <div class="bg-red-500 rounded-full p-1 mt-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="text-gray-800 font-medium">Pay-to-unlock basic features</span>
                        </li>
                        <li class="flex items-start gap-4 p-3 rounded-xl bg-red-50 border border-red-100">
                            <div class="bg-red-500 rounded-full p-1 mt-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="text-gray-800 font-medium">Data harvesting for advertisers</span>
                        </li>
                    </ul>
                </div>
            </div>
            
            <!-- Us Column -->
            <div class="group relative">
                <!-- Background decoration -->
                <div class="absolute inset-0 bg-gradient-to-br from-emerald-100 to-green-200 rounded-3xl transform -rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                
                <div class="relative bg-white border-2 border-emerald-200 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <!-- Header with icon -->
                    <div class="flex items-center justify-center mb-8">
                        <div class="bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-2xl shadow-lg">
                            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                    
                    <h3 class="text-3xl font-black text-center mb-2 bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">
                        h2ktalk
                    </h3>
                    <p class="text-center text-emerald-600 font-semibold mb-8">The community-first approach</p>
                    
                    <ul class="space-y-4">
                        <li class="flex items-start gap-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <div class="bg-emerald-500 rounded-full p-1 mt-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="text-gray-800 font-medium">Zero ads, ever. Period.</span>
                        </li>
                        <li class="flex items-start gap-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <div class="bg-emerald-500 rounded-full p-1 mt-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="text-gray-800 font-medium">All colors free & included</span>
                        </li>
                        <li class="flex items-start gap-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <div class="bg-emerald-500 rounded-full p-1 mt-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="text-gray-800 font-medium">No virtual currency nonsense</span>
                        </li>
                        <li class="flex items-start gap-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <div class="bg-emerald-500 rounded-full p-1 mt-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="text-gray-800 font-medium">Pure conversation experience</span>
                        </li>
                        <li class="flex items-start gap-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <div class="bg-emerald-500 rounded-full p-1 mt-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="text-gray-800 font-medium">Everything unlocked by default</span>
                        </li>
                        <li class="flex items-start gap-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <div class="bg-emerald-500 rounded-full p-1 mt-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                </svg>
                            </div>
                            <span class="text-gray-800 font-medium">Your privacy actually respected</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        
        <!-- Bottom CTA -->
        <div class="text-center mt-16">
            <div class="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-full font-semibold text-lg shadow-lg">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                The choice is obvious
            </div>
        </div>
    </div>
</section>

<!-- CTA Section -->
<section class="relative py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
    <!-- Background decoration -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(79,70,229,0.3),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(6,182,212,0.2),transparent_50%)]"></div>
    
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-4xl lg:text-6xl font-black mb-6">
            Ready to Chat Like It's 2005?
        </h2>
        <p class="text-xl lg:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto">
            But with modern features and zero corporate interference
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="{{ route('register') }}" onclick="if(typeof trackEvent === 'function') trackEvent('register_click', 'conversion', 'bottom_cta')" class="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-10 py-4 rounded-xl font-semibold text-xl transition-all duration-200 hover:scale-105 shadow-xl hover:shadow-2xl">
                Get Started Now
            </a>
        </div>
    </div>
</section>
@endsection

@section('scripts')
// Add smooth scroll parallax to hero screenshots
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const rate = scrolled * -0.5;
    
    const screenshots = document.querySelectorAll('[data-parallax]');
    screenshots.forEach((screenshot, index) => {
        const speed = 0.3 + (index * 0.1);
        screenshot.style.transform += ` translateY(${rate * speed}px)`;
    });
});

// Add intersection observer for cards animation
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animationDelay = `${Math.random() * 0.3}s`;
            entry.target.classList.add('animate-fade-in');
        }
    });
}, observerOptions);

document.querySelectorAll('.group').forEach(card => {
    observer.observe(card);
});
@endsection