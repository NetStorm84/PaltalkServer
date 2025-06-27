/**
 * Application constants and configuration
 */

const SERVER_CONFIG = {
    CHAT_PORT: 5001,
    VOICE_PORT: 2090,
    WEB_UI_PORT: 3000,
    SERVER_IP: process.env.SERVER_IP || '192.168.1.16', // Use localhost by default, override with env var if needed
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
    ROOM_JOINS_PER_MINUTE: 5,
    // Voice server specific rate limits
    VOICE_AUTH_WARNINGS_PER_MINUTE: 5, // Limit unauthenticated connection warnings
    VOICE_DEBUG_LOGS_PER_CONNECTION: 10, // Max debug logs per connection per minute
    LOG_RATE_LIMIT_WINDOW_MS: 60000 // 1 minute window for rate limiting logs
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
    DEFAULT_CHAT_FREQUENCY_MS: 1500, // Check every 1.5 seconds for more responsive chatting
    DEFAULT_MOVE_FREQUENCY_MS: 300000, // Move rooms every 5 minutes
    MIN_CHAT_FREQUENCY_MS: 500, // Minimum 0.5 second between checks
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
    },
    // Bot text formatting styles - each bot gets assigned one of these and sticks to it
    // Using correct Paltalk formatting with numeric color codes
    TEXT_STYLES: {
        REGULAR: {
            name: 'regular',
            format: (text) => text // No formatting
        },
        RED: {
            name: 'red',
            format: (text) => `<pfont color="#16711680">${text}</pfont>`
        },
        BLUE: {
            name: 'blue',
            format: (text) => `<pfont color="#255">${text}</pfont>`
        },
        GREEN: {
            name: 'green',
            format: (text) => `<pfont color="#65280">${text}</pfont>`
        },
        PURPLE: {
            name: 'purple',
            format: (text) => `<pfont color="#8388736">${text}</pfont>`
        },
        ORANGE: {
            name: 'orange',
            format: (text) => `<pfont color="#16744448">${text}</pfont>`
        },
        BOLD: {
            name: 'bold',
            format: (text) => `<pb>${text}</pb>`
        },
        ITALIC: {
            name: 'italic',
            format: (text) => `<pi>${text}</pi>`
        },
        RED_BOLD: {
            name: 'red_bold',
            format: (text) => `<pb><pfont color="#16711680">${text}</pfont></pb>`
        },
        BLUE_BOLD: {
            name: 'blue_bold',
            format: (text) => `<pb><pfont color="#255">${text}</pfont></pb>`
        },
        GREEN_ITALIC: {
            name: 'green_italic',
            format: (text) => `<pi><pfont color="#65280">${text}</pfont></pi>`
        },
        PURPLE_BOLD: {
            name: 'purple_bold',
            format: (text) => `<pb><pfont color="#8388736">${text}</pfont></pb>`
        }
    }
};

const LOGGING_CONFIG = {
    // Voice server logging levels and rate limiting
    VOICE_SERVER: {
        SUPPRESS_REPEATED_WARNINGS: true,
        MAX_REPEATED_MESSAGES_PER_MINUTE: 3,
        SUPPRESS_AUTH_WARNINGS_AFTER: 5, // After 5 warnings, reduce frequency
        DEBUG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
        LOG_PACKET_DETAILS: false, // Set to true for detailed RTP packet logging
        LOG_CONNECTION_DETAILS: true
    },
    // Enhanced packet logging configuration
    PACKET_LOGGING: {
        ENABLED: true,
        DETAILED_ANALYSIS: true, // Enable detailed header/payload analysis
        MAX_PAYLOAD_DISPLAY: 512, // Maximum bytes to display in logs
        LOG_DIRECTIONS: {
            CLIENT_TO_SERVER: true,
            SERVER_TO_CLIENT: true
        },
        FILTER_PACKET_TYPES: [], // Array of packet types to exclude from logging
        INCLUDE_PACKET_TYPES: [], // If not empty, only log these packet types
        LOG_LEVELS: {
            PACKET_RECEIVED: 'info',
            PACKET_SENT: 'info',
            PACKET_ERROR: 'error'
        },
        PERFORMANCE_MONITORING: true // Track logging performance impact
    },
    // General logging rate limiting
    RATE_LIMITING: {
        ENABLED: true,
        WINDOW_SIZE_MS: 60000, // 1 minute
        MAX_DUPLICATE_MESSAGES: 5,
        BURST_THRESHOLD: 10 // Allow bursts up to this many messages
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
    BOT_CONFIG,
    LOGGING_CONFIG
};
