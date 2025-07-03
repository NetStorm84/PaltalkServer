#!/bin/bash

# H2KTalk Production Deployment Script
# This script deploys the application to a production Apache server

set -e  # Exit on any error

echo "🚀 H2KTalk Production Deployment"
echo "=================================="

# Configuration
DEPLOY_USER="www-data"
DEPLOY_PATH="/var/www/h2ktalk.fun"
SERVICE_NAME="h2ktalk-server"
APACHE_SITE="h2ktalk"

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo "❌ This script must be run as root (use sudo)"
        exit 1
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo ""
echo "🔍 Pre-deployment checks..."

# Check if we're running as root
check_root

# Check dependencies
echo "   Checking required software..."

if ! command_exists apache2; then
    echo "❌ Apache2 is not installed. Installing..."
    apt update && apt install -y apache2
fi

if ! command_exists node; then
    echo "❌ Node.js is not installed. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

if ! command_exists php; then
    echo "❌ PHP is not installed. Installing..."
    apt install -y php php-cli php-mbstring php-xml php-sqlite3 php-curl php-zip
fi

if ! command_exists composer; then
    echo "❌ Composer is not installed. Installing..."
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
fi

if ! command_exists pm2; then
    echo "❌ PM2 is not installed. Installing..."
    npm install -g pm2
fi

echo "✅ All dependencies satisfied"

# Create deployment directory
echo ""
echo "📁 Setting up deployment directory..."

if [ ! -d "$DEPLOY_PATH" ]; then
    mkdir -p "$DEPLOY_PATH"
    echo "   Created directory: $DEPLOY_PATH"
fi

# Set ownership
chown -R $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_PATH"

echo "   Copying application files..."

# Copy application files (assuming we're running from the project directory)
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the server root directory."
    exit 1
fi

# Copy all files except development-specific ones
rsync -av --exclude='node_modules' \
          --exclude='.git' \
          --exclude='*.log' \
          --exclude='h2ktalk-web/storage/logs/*' \
          --exclude='h2ktalk-web/.env' \
          ./ "$DEPLOY_PATH/"

echo "✅ Files copied successfully"

# Set up Node.js application
echo ""
echo "📦 Setting up Node.js application..."

cd "$DEPLOY_PATH"

# Install Node.js dependencies
sudo -u $DEPLOY_USER npm install --production

# Create necessary directories
mkdir -p logs backups
chown -R $DEPLOY_USER:$DEPLOY_USER logs backups

echo "✅ Node.js application ready"

# Set up Laravel application
echo ""
echo "🐘 Setting up Laravel application..."

cd h2ktalk-web

# Copy production environment file
if [ -f ".env.production" ]; then
    cp .env.production .env
    echo "   Copied production environment configuration"
else
    echo "⚠️  No .env.production file found. You'll need to configure .env manually."
fi

# Install Composer dependencies
sudo -u $DEPLOY_USER composer install --optimize-autoloader --no-dev

# Generate application key if not set
if ! grep -q "APP_KEY=base64:" .env; then
    sudo -u $DEPLOY_USER php artisan key:generate
fi

# Set up database
if [ ! -f "../database/database.sqlite" ]; then
    echo "   Creating SQLite database..."
    mkdir -p ../database
    touch ../database/database.sqlite
    chown $DEPLOY_USER:$DEPLOY_USER ../database/database.sqlite
    
    # Run migrations
    sudo -u $DEPLOY_USER php artisan migrate --force
fi

# Set permissions
chown -R $DEPLOY_USER:$DEPLOY_USER storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

# Clear caches
sudo -u $DEPLOY_USER php artisan config:cache
sudo -u $DEPLOY_USER php artisan route:cache
sudo -u $DEPLOY_USER php artisan view:cache

echo "✅ Laravel application ready"

# Set up Apache configuration
echo ""
echo "🌐 Configuring Apache..."

# Enable required modules
a2enmod rewrite ssl headers proxy proxy_http proxy_wstunnel

# Copy Apache configuration
if [ -f "../apache-production.conf" ]; then
    cp "../apache-production.conf" "/etc/apache2/sites-available/${APACHE_SITE}.conf"
    echo "   Apache configuration copied"
    
    # Enable the site
    a2ensite ${APACHE_SITE}.conf
    
    # Disable default site if it exists
    a2dissite 000-default.conf 2>/dev/null || true
    
    # Test configuration
    if apache2ctl configtest; then
        echo "   ✅ Apache configuration is valid"
    else
        echo "   ❌ Apache configuration has errors"
        exit 1
    fi
else
    echo "   ⚠️  Apache configuration file not found. You'll need to configure Apache manually."
fi

# Set up PM2 for Node.js process management
echo ""
echo "⚙️  Setting up PM2 process management..."

cd "$DEPLOY_PATH"

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${SERVICE_NAME}',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_file: 'logs/pm2-combined.log',
    time: true
  }]
};
EOF

chown $DEPLOY_USER:$DEPLOY_USER ecosystem.config.js

# Start the application with PM2
sudo -u $DEPLOY_USER pm2 start ecosystem.config.js
sudo -u $DEPLOY_USER pm2 save

# Set up PM2 to start on boot
pm2 startup systemd -u $DEPLOY_USER --hp "/home/$DEPLOY_USER"

echo "✅ PM2 configured successfully"

# Start/restart Apache
echo ""
echo "🔄 Starting services..."

systemctl restart apache2
systemctl enable apache2

echo "✅ Apache restarted"

# Final status check
echo ""
echo "📋 Deployment Status:"
echo "===================="

# Check Apache status
echo -n "Apache: "
if systemctl is-active --quiet apache2; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check Node.js application status
echo -n "Node.js Server: "
if sudo -u $DEPLOY_USER pm2 show $SERVICE_NAME >/dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Test web connectivity
echo -n "Web Server: "
if curl -s http://localhost >/dev/null 2>&1; then
    echo "✅ Responding"
else
    echo "❌ Not responding"
fi

# Check database
echo -n "Database: "
cd "$DEPLOY_PATH/h2ktalk-web"
if sudo -u $DEPLOY_USER php artisan migrate:status >/dev/null 2>&1; then
    echo "✅ Connected"
else
    echo "❌ Connection failed"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📝 Post-deployment tasks:"
echo "========================"
echo "1. Configure SSL certificates in Apache configuration"
echo "2. Set up proper DNS records for your domain"
echo "3. Configure firewall rules (allow ports 80, 443)"
echo "4. Set up monitoring and log rotation"
echo "5. Configure email settings in Laravel .env"
echo ""

echo "🌐 Your application should be available at:"
echo "• HTTP: http://your-domain"
echo "• HTTPS: https://your-domain (after SSL setup)"
echo "• Admin: https://your-domain/admin/dashboard"
echo ""

echo "📊 Monitoring commands:"
echo "• Check PM2 status: sudo -u $DEPLOY_USER pm2 status"
echo "• View PM2 logs: sudo -u $DEPLOY_USER pm2 logs"
echo "• Check Apache status: systemctl status apache2"
echo "• View Apache logs: tail -f /var/log/apache2/h2ktalk-error.log"