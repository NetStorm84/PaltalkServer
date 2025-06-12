/**
 * Application constants and configuration
 */

const SERVER_CONFIG = {
    CHAT_PORT: 5001,
    VOICE_PORT: 2090,
    WEB_UI_PORT: 3000,
    SERVER_KEY: 'XyF¦164473312518',
    DATABASE_PATH: 'database.db'
};

const USER_PERMISSIONS = {
    REGULAR: 0,
    MODERATOR: 1,
    ADMIN: 2,
    SUPER_ADMIN: 3
};

const ROOM_TYPES = {
    TEXT: 0,
    VOICE: 1
};

const USER_MODES = {
    OFFLINE: 0,
    ONLINE: 30,  // 0x1E
    AWAY: 70     // 0x46
};

const MESSAGE_LIMITS = {
    CHAT_MESSAGE: 1000,
    ROOM_NAME: 64,
    NICKNAME: 32,
    TOPIC: 255,
    IM_MESSAGE: 2000
};

const RATE_LIMITS = {
    MESSAGES_PER_MINUTE: 30,
    PACKETS_PER_SECOND: 30,
    LOGIN_ATTEMPTS_PER_HOUR: 10,
    ROOM_JOINS_PER_MINUTE: 5
};

const SECURITY_SETTINGS = {
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    MAX_FAILED_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes
};

module.exports = {
    SERVER_CONFIG,
    USER_PERMISSIONS,
    ROOM_TYPES,
    USER_MODES,
    MESSAGE_LIMITS,
    RATE_LIMITS,
    SECURITY_SETTINGS
};
