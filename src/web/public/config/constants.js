// Configuration constants for standalone deployment
const SERVER_CONFIG = {
    WEB_PORT: 3000,
    CHAT_PORT: 5001,
    VOICE_PORT: 2090
};

const SECURITY_SETTINGS = {
    JWT_SECRET: process.env.JWT_SECRET || 'h2ktalk-secret-key-change-in-production',
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes
};

module.exports = {
    SERVER_CONFIG,
    SECURITY_SETTINGS
};