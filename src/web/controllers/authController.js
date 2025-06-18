/**
 * Authentication controller for login and session management
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { SECURITY_SETTINGS } = require('../../config/constants');
const logger = require('../../utils/logger');

class AuthController {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.failedLoginAttempts = new Map(); // userId -> {count, timestamp}
    }

    /**
     * Handle dashboard login
     */
    async handleLogin(req, res) {
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Username and password are required' 
                });
            }
            
            // First, check if this is the dashboard admin from config
            const dashboardAdmin = SECURITY_SETTINGS.DASHBOARD_ADMIN;
            if (username === dashboardAdmin.USERNAME && password === dashboardAdmin.PASSWORD) {
                // Success with dashboard admin
                
                // Reset failed attempts if any
                this.clearFailedAttempts('dashboard-admin');
                
                // Create JWT token
                const adminUser = {
                    uid: 0, // Special ID for dashboard admin
                    nickname: dashboardAdmin.USERNAME,
                    admin: dashboardAdmin.ADMIN_LEVEL
                };
                
                return this.handleSuccessfulLogin(req, res, adminUser);
            }
            
            // If not dashboard admin, check database users
            // Find user in database
            const user = await this.db.getUserByNickname(username);
            
            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid username or password' 
                });
            }
            
            // Check if account is locked due to too many failed attempts
            const locked = this.checkAccountLock(user.uid);
            if (locked) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Account temporarily locked. Try again later.' 
                });
            }
            
            // Check if user has admin privileges (only admins can access dashboard)
            if (user.admin < 2) { // Not an admin
                this.recordFailedAttempt(user.uid);
                return res.status(403).json({ 
                    success: false, 
                    message: 'Access denied. Admin privileges required.' 
                });
            }
            
            // Verify password
            const validPassword = await this.verifyPassword(password, user.password);
            
            if (!validPassword) {
                this.recordFailedAttempt(user.uid);
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid username or password' 
                });
            }
            
            // Reset failed attempts on successful login
            this.clearFailedAttempts(user.uid);
            
            return this.handleSuccessfulLogin(req, res, user);
            
        } catch (error) {
            logger.error('Login failed', error, { ip: req.ip });
            return res.status(500).json({ 
                success: false, 
                message: 'Login failed. Please try again.' 
            });
        }
    }

    /**
     * Handle user logout
     */
    handleLogout(req, res) {
        try {
            // Clear session
            req.session.destroy();
            
            // Clear authentication cookie
            res.clearCookie(SECURITY_SETTINGS.DASHBOARD_COOKIE_NAME);
            
            return res.json({ 
                success: true, 
                message: 'Logged out successfully' 
            });
        } catch (error) {
            logger.error('Logout failed', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Logout failed. Please try again.' 
            });
        }
    }

    /**
     * Check if an account is locked due to too many failed attempts
     */
    checkAccountLock(userId) {
        const failedAttempt = this.failedLoginAttempts.get(userId);
        
        if (!failedAttempt) return false;
        
        const { count, timestamp } = failedAttempt;
        const now = Date.now();
        
        // If lock duration has passed, reset failed attempts
        if (count >= SECURITY_SETTINGS.MAX_FAILED_LOGIN_ATTEMPTS && 
            now - timestamp < SECURITY_SETTINGS.LOCKOUT_DURATION) {
            return true;
        }
        
        // Reset if lockout duration has passed
        if (now - timestamp > SECURITY_SETTINGS.LOCKOUT_DURATION) {
            this.clearFailedAttempts(userId);
        }
        
        return false;
    }

    /**
     * Record a failed login attempt
     */
    recordFailedAttempt(userId) {
        const existing = this.failedLoginAttempts.get(userId) || { count: 0, timestamp: Date.now() };
        
        existing.count++;
        existing.timestamp = Date.now();
        
        this.failedLoginAttempts.set(userId, existing);
        
        logger.warn('Failed login attempt recorded', { 
            userId,
            attempts: existing.count,
            isLocked: existing.count >= SECURITY_SETTINGS.MAX_FAILED_LOGIN_ATTEMPTS
        });
    }

    /**
     * Clear failed login attempts for a user
     */
    clearFailedAttempts(userId) {
        this.failedLoginAttempts.delete(userId);
    }

    /**
     * Get permissions based on user admin level
     */
    getUserPermissions(adminLevel) {
        const permissions = {
            read: true  // Everyone can read basic info
        };
        
        if (adminLevel >= 1) {  // Moderator
            permissions.moderate = true;
        }
        
        if (adminLevel >= 2) {  // Admin
            permissions.moderate = true;
            permissions.admin = true;
        }
        
        if (adminLevel >= 3) {  // Super Admin
            permissions.moderate = true;
            permissions.admin = true;
            permissions.superAdmin = true;
        }
        
        return permissions;
    }

    /**
     * Verify password using bcrypt
     */
    async verifyPassword(plainPassword, hashedPassword) {
        try {
            // If we already use bcrypt
            if (hashedPassword.startsWith('$2')) {
                return await bcrypt.compare(plainPassword, hashedPassword);
            }
            
            // For legacy passwords (plain text or other format)
            return plainPassword === hashedPassword;
            
        } catch (error) {
            logger.error('Password verification error', error);
            return false;
        }
    }
    
    /**
     * Handle successful login for both database users and dashboard admin
     */
    handleSuccessfulLogin(req, res, user) {
        // Create JWT token
        const token = jwt.sign(
            { 
                id: user.uid, 
                username: user.nickname, 
                isAdmin: user.admin >= 2 
            },
            SECURITY_SETTINGS.JWT_SECRET,
            { expiresIn: SECURITY_SETTINGS.JWT_EXPIRY }
        );
        
        // Set session data
        req.session.isAuthenticated = true;
        req.session.userId = user.uid;
        req.session.username = user.nickname;
        req.session.isAdmin = user.admin >= 2;
        
        // Set token in cookie
        res.cookie(SECURITY_SETTINGS.DASHBOARD_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: SECURITY_SETTINGS.DASHBOARD_COOKIE_MAX_AGE
        });
        
        logger.info('User logged in', { 
            userId: user.uid,
            nickname: user.nickname,
            isAdmin: user.admin >= 2,
            ip: req.ip
        });
        
        return res.json({ 
            success: true, 
            message: 'Login successful',
            user: {
                id: user.uid,
                username: user.nickname,
                isAdmin: user.admin >= 2
            }
        });
    }
}

module.exports = AuthController;
