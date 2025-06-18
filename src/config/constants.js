/**
 * Application constants and configuration
 */

const SERVER_CONFIG = {
    CHAT_PORT: 5001,
    VOICE_PORT: 2090,
    WEB_UI_PORT: 3000,
    SERVER_IP: '192.168.1.16', // Network IP address for external connections
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
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    JWT_SECRET: process.env.JWT_SECRET || 'paltalk-server-secret-key-change-in-production',
    JWT_EXPIRY: '24h',
    DASHBOARD_COOKIE_NAME: 'dashboard_auth',
    DASHBOARD_COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    DASHBOARD_ADMIN: {
        USERNAME: 'admin',
        PASSWORD: 'password123', // Change this in production!
        ADMIN_LEVEL: 3 // Super admin
    }
};

const BOT_CONFIG = {
    DEFAULT_BOT_COUNT: 10,
    MAX_BOT_COUNT: 5000, // Maximum number of bots allowed
    DEFAULT_CHAT_FREQUENCY_MS: 3000, // Chat every 3 seconds for very active rooms
    DEFAULT_MOVE_FREQUENCY_MS: 300000, // Move rooms every 5 minutes
    MIN_CHAT_FREQUENCY_MS: 1000, // Minimum 1 second between chats
    MAX_CHAT_FREQUENCY_MS: 300000, // Maximum 5 minutes between chats
    MIN_MOVE_FREQUENCY_MS: 60000, // Minimum 1 minute between moves
    MAX_MOVE_FREQUENCY_MS: 1800000, // Maximum 30 minutes between moves
    BOT_UID_START: 2000000, // Starting UID for bots to avoid conflicts
    MAX_BOTS_PER_ROOM: 100, // Maximum bots allowed in a single room
    ROOM_DISTRIBUTION_MODES: {
        RANDOM: 'random', // Distribute bots randomly across all public rooms
        SINGLE_ROOM: 'single_room', // Put all bots in one specific room
        WEIGHTED: 'weighted', // Distribute based on room popularity
        BALANCED: 'balanced' // Try to balance bot distribution across rooms
    },
    // Bot status colors for room list display
    STATUS_COLORS: {
        BLACK: '000000000', // Most common - regular users
        GREEN: '000128000', // Some bots appear as premium/online
        BLUE: '000000255'   // Few bots appear as special status
    }
};

module.exports = {
    SERVER_CONFIG,
    USER_PERMISSIONS,
    ROOM_TYPES,
    USER_MODES,
    MESSAGE_LIMITS,
    RATE_LIMITS,
    SECURITY_SETTINGS,
    BOT_CONFIG
};
