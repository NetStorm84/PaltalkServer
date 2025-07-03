#!/bin/bash

# H2KTalk Development Setup Script
# This script sets up both the Node.js server and Laravel Sail for development

set -e  # Exit on any error

echo "🚀 H2KTalk Development Setup"
echo "==============================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "h2ktalk-web" ]; then
    echo "❌ Error: Please run this script from the server root directory"
    echo "   Expected: /Users/dan/Documents/Sites/paltalk.fun/server"
    exit 1
fi

echo ""
echo "📍 Current directory: $(pwd)"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -ti:$1 >/dev/null 2>&1
}

# Check dependencies
echo "🔍 Checking dependencies..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✅ All dependencies found"
echo ""

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    npm install
else
    echo "   Dependencies already installed"
fi

# Set up Laravel Sail
echo "🐳 Setting up Laravel Sail..."
cd h2ktalk-web

if [ ! -f ".env" ]; then
    echo "   Creating .env file from .env.example..."
    cp .env.example .env
fi

# Check if Sail is already running
if docker ps | grep -q "h2ktalk-web-laravel.test-1"; then
    echo "   ✅ Sail is already running"
else
    echo "   Starting Sail..."
    ./vendor/bin/sail up -d
    echo "   Waiting for containers to be ready..."
    sleep 10
fi

echo "   Clearing Laravel caches..."
./vendor/bin/sail artisan config:clear >/dev/null 2>&1 || true
./vendor/bin/sail artisan cache:clear >/dev/null 2>&1 || true

cd ..

# Check Node.js server status
echo ""
echo "🖥️  Checking Node.js server status..."

if port_in_use 3000; then
    echo "   ✅ Node.js server is already running on port 3000"
    
    # Test if it's responding
    if curl -s http://localhost:3000/api/health >/dev/null; then
        echo "   ✅ Server is responding to health checks"
    else
        echo "   ⚠️  Server is running but not responding properly"
    fi
else
    echo "   🚀 Starting Node.js server..."
    
    # Start the server in the background
    npm start &
    SERVER_PID=$!
    
    echo "   Server started with PID: $SERVER_PID"
    echo "   Waiting for server to be ready..."
    
    # Wait for server to be ready (max 30 seconds)
    for i in {1..30}; do
        if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
            echo "   ✅ Server is ready!"
            break
        fi
        
        if [ $i -eq 30 ]; then
            echo "   ❌ Server failed to start within 30 seconds"
            exit 1
        fi
        
        sleep 1
        echo -n "."
    done
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Status Summary:"
echo "=================="

# Check all services
echo -n "Node.js Server (Port 3000): "
if curl -s http://localhost:3000/api/health >/dev/null; then
    echo "✅ Running"
else
    echo "❌ Not responding"
fi

echo -n "Chat Server (Port 5001): "
if port_in_use 5001; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

echo -n "Laravel Sail (Port 80): "
if curl -s http://localhost >/dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not responding"
fi

echo -n "Socket.IO: "
if curl -s http://localhost:3000/socket.io/socket.io.js >/dev/null; then
    echo "✅ Available"
else
    echo "❌ Not available"
fi

echo ""
echo "🌐 Access URLs:"
echo "==============="
echo "• Laravel Web Interface: http://localhost"
echo "• Admin Dashboard: http://localhost/admin/dashboard"
echo "• Node.js Web Interface: http://localhost:3000"
echo "• API Health Check: http://localhost:3000/api/health"
echo ""

echo "📖 Development Notes:"
echo "===================="
echo "• The Node.js server handles chat, voice, and Socket.IO"
echo "• Laravel Sail provides the admin interface"
echo "• Both systems share the same SQLite database"
echo "• Real-time features require both servers to be running"
echo ""

echo "🛠️  Common Commands:"
echo "=================="
echo "• Stop Node.js server: pkill -f 'node.*src/server.js'"
echo "• Stop Sail: ./h2ktalk-web/vendor/bin/sail down"
echo "• View Node.js logs: tail -f server.log"
echo "• View Laravel logs: ./h2ktalk-web/vendor/bin/sail artisan log:tail"
echo ""

echo "✨ Ready for development!"