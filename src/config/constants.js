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

const USER_MODES = {
    OFFLINE: 0x00,
    ONLINE: 0x1e,
    AWAY: 0x46
};

const ROOM_TYPES = {
    TEXT: 0,
    VOICE: 1
};

const USER_PERMISSIONS = {
    REGULAR: 0,
    ADMIN: 1,
    SUPER_ADMIN: 2
};

module.exports = {
    SERVER_CONFIG,
    USER_MODES,
    ROOM_TYPES,
    USER_PERMISSIONS
};
