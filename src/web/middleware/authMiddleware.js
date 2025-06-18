/**
 * Authentication middleware for dashboard routes
 */
const jwt = require('jsonwebtoken');
const { SECURITY_SETTINGS } = require('../../config/constants');

/**
 * Middleware to verify session-based authentication for dashboard pages
 */
const requireAuth = (req, res, next) => {
    // Check if user is authenticated through session
    if (req.session && req.session.isAuthenticated) {
        return next();
    }
    
    // Check if user has a valid JWT token in cookies
    const token = req.cookies[SECURITY_SETTINGS.DASHBOARD_COOKIE_NAME];
    
    if (token) {
        try {
            const decoded = jwt.verify(token, SECURITY_SETTINGS.JWT_SECRET);
            
            // Set session data from token
            req.session.isAuthenticated = true;
            req.session.userId = decoded.id;
            req.session.username = decoded.username;
            req.session.isAdmin = decoded.isAdmin;
            
            return next();
        } catch (error) {
            // Invalid token, clear it
            res.clearCookie(SECURITY_SETTINGS.DASHBOARD_COOKIE_NAME);
        }
    }
    
    // Redirect to login page
    res.redirect('/login');
};

/**
 * Middleware to verify admin rights
 */
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.isAuthenticated && req.session.isAdmin) {
        return next();
    }
    
    return res.status(403).json({ success: false, message: 'Admin rights required' });
};

/**
 * Middleware to verify API requests with JWT token
 */
const requireApiAuth = (req, res, next) => {
    // Check header, query string, or cookies for token
    const token = req.headers['x-access-token'] || req.headers['authorization']?.split(' ')[1] || 
                  req.query.token || req.cookies[SECURITY_SETTINGS.DASHBOARD_COOKIE_NAME];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication token is required' });
    }
    
    try {
        const decoded = jwt.verify(token, SECURITY_SETTINGS.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }
};

module.exports = {
    requireAuth,
    requireAdmin,
    requireApiAuth
};
