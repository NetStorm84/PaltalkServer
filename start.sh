#!/bin/bash

# Paltalk Server Startup Script
echo "🚀 Starting Paltalk Server..."
echo "=============================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create required directories
mkdir -p logs backups

# Check if database exists, create if not
if [ ! -f "database.db" ]; then
    echo "🗄️ Creating database..."
    node database.js
fi

echo ""
echo "📱 Chat Server: http://localhost:5001"
echo "🎤 Voice Server: http://localhost:8075" 
echo "🌐 Web Dashboard: http://localhost:3000"
echo ""
echo "Starting server..."

# Start the main server
npm start
