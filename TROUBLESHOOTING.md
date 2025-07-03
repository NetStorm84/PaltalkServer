# H2KTalk Troubleshooting Guide

This guide helps resolve common issues with the H2KTalk server and admin dashboard.

## Quick Status Check

### Development Environment (Sail)

1. **Check if Node.js server is running:**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Expected response: `{"status":"ok","timestamp":"...","server":"h2ktalk-server","version":"1.0.0"}`

2. **Check if Laravel Sail is running:**
   ```bash
   cd h2ktalk-web && ./vendor/bin/sail ps
   ```

3. **Check if admin dashboard loads:**
   ```bash
   curl -s http://localhost/admin/dashboard | head -10
   ```

### Production Environment

1. **Check services:**
   ```bash
   sudo systemctl status apache2
   sudo -u www-data pm2 status
   ```

2. **Check web access:**
   ```bash
   curl -s http://your-domain/admin/dashboard | head -10
   ```

## Common Issues

### 1. "Socket.IO not available" or Real-time Features Not Working

**Symptoms:**
- Admin dashboard shows "Disconnected" status
- Real-time updates don't work
- Console shows Socket.IO errors

**Solutions:**

**For Development (Sail):**
```bash
# 1. Check if Node.js server is running
ps aux | grep "node.*src/server.js"

# 2. If not running, start it
npm start

# 3. Clear Laravel config cache
cd h2ktalk-web && ./vendor/bin/sail artisan config:clear

# 4. Test Socket.IO availability
curl http://localhost:3000/socket.io/socket.io.js | head -5
```

**For Production:**
```bash
# 1. Check PM2 status
sudo -u www-data pm2 status

# 2. Restart Node.js server if needed
sudo -u www-data pm2 restart h2ktalk-server

# 3. Check Apache proxy configuration
sudo apache2ctl configtest
```

### 2. "Server management not available in Docker environment"

**Symptoms:**
- Start/Stop server buttons show error message
- Cannot control server from admin dashboard

**This is expected behavior in development.** The admin dashboard detects it's running in Docker and disables server management features. To manage the server:

```bash
# Start Node.js server manually
npm start

# Stop Node.js server
pkill -f "node.*src/server.js"

# Check status
curl http://localhost:3000/api/health
```

### 3. Database Connection Issues

**Symptoms:**
- User management shows no users
- "Database connection failed" errors

**Solutions:**

**For Development:**
```bash
# Check if database file exists
ls -la h2ktalk-web/database/database.sqlite

# If not, create it
cd h2ktalk-web && ./vendor/bin/sail artisan migrate

# Check permissions
ls -la h2ktalk-web/database/
```

**For Production:**
```bash
# Check database file
ls -la /var/www/h2ktalk.fun/database/database.sqlite

# Fix permissions
sudo chown www-data:www-data /var/www/h2ktalk.fun/database/database.sqlite

# Test database connection
cd /var/www/h2ktalk.fun/h2ktalk-web
sudo -u www-data php artisan migrate:status
```

### 4. Laravel Admin Dashboard Not Loading

**Symptoms:**
- HTTP 500 errors
- Blank page or PHP errors

**Solutions:**

**Check Laravel logs:**
```bash
# Development
cd h2ktalk-web && ./vendor/bin/sail artisan log:tail

# Production
tail -f /var/www/h2ktalk.fun/h2ktalk-web/storage/logs/laravel.log
```

**Common fixes:**
```bash
# Clear all caches
cd h2ktalk-web && ./vendor/bin/sail artisan cache:clear
cd h2ktalk-web && ./vendor/bin/sail artisan config:clear
cd h2ktalk-web && ./vendor/bin/sail artisan route:clear
cd h2ktalk-web && ./vendor/bin/sail artisan view:clear

# Check file permissions (production)
sudo chown -R www-data:www-data /var/www/h2ktalk.fun/h2ktalk-web/storage
sudo chmod -R 775 /var/www/h2ktalk.fun/h2ktalk-web/storage
```

### 5. "Cannot reach Socket.IO server" in Browser Console

**Symptoms:**
- Browser console shows connection errors
- Real-time features don't work

**Check network configuration:**

**Development:**
1. Verify Node.js server is accessible from browser:
   - Open http://localhost:3000 in browser
   - Should show Node.js web interface

2. Check if Socket.IO script loads:
   - Open http://localhost:3000/socket.io/socket.io.js in browser
   - Should download JavaScript file

**Production:**
1. Check Apache proxy configuration
2. Verify WebSocket support is enabled
3. Check firewall rules

### 6. API Endpoints Return "Chat server not available"

**Symptoms:**
- Admin dashboard shows server offline
- API calls fail with connection errors

**Solutions:**

```bash
# Check if Node.js server is responding
curl http://localhost:3000/api/server-state

# Check if Laravel can reach Node.js server
# Development:
curl -H "Authorization: Bearer admin-dev-token" http://localhost/api/server-state

# Production:
curl -H "Authorization: Bearer admin-dev-token" http://your-domain/api/server-state
```

**If Node.js server is not responding:**
```bash
# Check if server process is running
ps aux | grep node

# Check server logs
tail -f server.log

# Restart server
npm start  # Development
sudo -u www-data pm2 restart h2ktalk-server  # Production
```

## Environment-Specific Issues

### Docker/Sail Issues

1. **Container networking:**
   ```bash
   # Check if containers can communicate
   cd h2ktalk-web && ./vendor/bin/sail exec laravel.test curl http://host.docker.internal:3000/api/health
   ```

2. **Port conflicts:**
   ```bash
   # Check what's using port 80
   lsof -i :80
   
   # Check Sail port configuration
   grep -r "APP_PORT" h2ktalk-web/.env
   ```

### Production Issues

1. **SSL/HTTPS issues:**
   ```bash
   # Check SSL certificate
   sudo apache2ctl configtest
   
   # Check certificate files exist
   ls -la /etc/ssl/certs/h2ktalk.fun.*
   ```

2. **Firewall issues:**
   ```bash
   # Check if ports are open
   sudo ufw status
   
   # Open required ports
   sudo ufw allow 80
   sudo ufw allow 443
   ```

## Performance Issues

### High CPU/Memory Usage

1. **Monitor Node.js server:**
   ```bash
   # Development
   ps aux | grep node
   
   # Production
   sudo -u www-data pm2 monit
   ```

2. **Monitor Laravel:**
   ```bash
   # Check PHP processes
   ps aux | grep php
   
   # Monitor Apache
   sudo systemctl status apache2
   ```

### Slow Response Times

1. **Enable Laravel query logging temporarily:**
   ```php
   // In AppServiceProvider boot() method
   DB::listen(function ($query) {
       Log::info($query->sql, $query->bindings, $query->time);
   });
   ```

2. **Check database file size:**
   ```bash
   ls -lh h2ktalk-web/database/database.sqlite
   ```

## Getting Help

### Collect Debug Information

Run this script to collect system information:

```bash
#!/bin/bash
echo "=== H2KTalk Debug Information ==="
echo "Date: $(date)"
echo "PWD: $(pwd)"
echo ""
echo "=== System Info ==="
uname -a
echo ""
echo "=== Node.js Status ==="
node --version
npm --version
ps aux | grep node
echo ""
echo "=== PHP Status ==="
php --version
echo ""
echo "=== Services ==="
curl -s http://localhost:3000/api/health || echo "Node.js server not responding"
curl -s http://localhost/admin/dashboard | head -5 || echo "Laravel not responding"
echo ""
echo "=== Processes ==="
ps aux | grep -E "(node|php|apache|nginx)"
echo ""
echo "=== Network ==="
netstat -tlnp | grep -E "(80|443|3000|5001)"
```

### Log Locations

**Development:**
- Node.js: `./server.log`
- Laravel: `./h2ktalk-web/storage/logs/laravel.log`
- Sail: `./h2ktalk-web/vendor/bin/sail logs`

**Production:**
- Node.js: `/var/www/h2ktalk.fun/logs/pm2-*.log`
- Laravel: `/var/www/h2ktalk.fun/h2ktalk-web/storage/logs/laravel.log`
- Apache: `/var/log/apache2/h2ktalk-*.log`
- System: `/var/log/syslog`

### Support Checklist

Before asking for help, please provide:

1. **Environment:** Development (Sail) or Production
2. **Operating System:** macOS, Linux distribution, etc.
3. **Error messages:** Exact error text from logs/console
4. **Steps to reproduce:** What you were doing when the issue occurred
5. **Recent changes:** Any configuration or code changes made recently
6. **Debug output:** Results from the debug information script above