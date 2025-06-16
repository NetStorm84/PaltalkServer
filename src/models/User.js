/**
 * Enhanced User model with better encapsulation and validation
 */
const Utils = require('../utils/utils');
const logger = require('../utils/logger');
const { USER_MODES, USER_PERMISSIONS } = require('../config/constants');

class User {
    constructor(userData) {
        this.uid = userData.uid;
        this.nickname = userData.nickname;
        this.email = userData.email;
        this.firstName = userData.first || '';
        this.lastName = userData.last || '';
        this.privacy = userData.privacy || 'A';
        this.verified = userData.verified || 0;
        this.random = userData.random || '0';
        this.paid1 = userData.paid1 || '0';
        this.admin = userData.admin || USER_PERMISSIONS.REGULAR;
        this.banners = userData.banners || 'yes';
        this.created = userData.created;
        this.lastLogin = userData.last_login;
        this.listed = userData.listed || 1;
        this.color = userData.color || '000000000';
        
        // Parse buddies and blocked lists
        this.buddies = Utils.safeJsonParse(userData.buddies, []);
        this.blocked = Utils.safeJsonParse(userData.blocked, []);
        
        // Runtime properties
        this.mode = USER_MODES.OFFLINE;
        this.currentRooms = new Set(); // Track multiple rooms user is in
        this.currentRoom = null; // Keep for backwards compatibility (primary room)
        this.socket = null;
        this.sessionId = Utils.generateSessionId();
        this.loginTime = new Date();
        
        // Voice/Room properties
        this.mic = 0;
        this.pub = 0;
        this.away = 0;
        this.visible = true;

        // Activity tracking
        this.lastActivity = null;
    }

    /**
     * Check if user is online
     * @returns {boolean}
     */
    isOnline() {
        return this.mode !== USER_MODES.OFFLINE && this.socket !== null;
    }

    /**
     * Check if user is admin
     * @returns {boolean}
     */
    isAdmin() {
        return this.admin === 1;
    }

    /**
     * Add user to a room
     * @param {number} roomId 
     */
    addToRoom(roomId) {
        this.currentRooms.add(roomId);
        if (!this.currentRoom) {
            this.currentRoom = roomId; // Set as primary room if none set
        }
    }

    /**
     * Remove user from a room
     * @param {number} roomId 
     */
    removeFromRoom(roomId) {
        this.currentRooms.delete(roomId);
        if (this.currentRoom === roomId) {
            // If removing primary room, set another room as primary or null
            const remainingRooms = Array.from(this.currentRooms);
            this.currentRoom = remainingRooms.length > 0 ? remainingRooms[0] : null;
        }
    }

    /**
     * Get all rooms user is currently in
     * @returns {Array<number>}
     */
    getRoomIds() {
        return Array.from(this.currentRooms);
    }

    /**
     * Check if user is in a specific room
     * @param {number} roomId 
     * @returns {boolean}
     */
    isInRoom(roomId) {
        return this.currentRooms.has(roomId);
    }

    /**
     * Get count of rooms user is in
     * @returns {number}
     */
    getRoomCount() {
        return this.currentRooms.size;
    }

    /**
     * Set user mode (online, away, offline)
     * @param {number} mode 
     */
    setMode(mode) {
        const oldMode = this.mode;
        this.mode = mode;
        
        if (oldMode !== mode) {
            logger.logUserAction('mode_change', this.uid, {
                oldMode,
                newMode: mode,
                nickname: this.nickname
            });
        }
    }

    /**
     * Update user's last activity timestamp
     */
    updateActivity() {
        this.lastActivity = new Date();
    }

    /**
     * Check if user is idle (no activity for specified time)
     * @param {number} idleTimeMs - Time in milliseconds to consider idle
     * @returns {boolean}
     */
    isIdle(idleTimeMs = 15 * 60 * 1000) { // 15 minutes default
        if (!this.lastActivity) return false;
        return Date.now() - this.lastActivity.getTime() > idleTimeMs;
    }

    /**
     * Get user's online duration in milliseconds
     * @returns {number}
     */
    getOnlineDuration() {
        if (!this.loginTime) return 0;
        return Date.now() - this.loginTime.getTime();
    }

    /**
     * Check if user has permission to perform action
     * @param {string} action - The action to check permission for
     * @returns {boolean}
     */
    hasPermission(action) {
        const permissions = {
            'kick_user': this.admin >= USER_PERMISSIONS.MODERATOR,
            'ban_user': this.admin >= USER_PERMISSIONS.ADMIN,
            'create_room': this.admin >= USER_PERMISSIONS.REGULAR,
            'broadcast_message': this.admin >= USER_PERMISSIONS.ADMIN,
            'delete_room': this.admin >= USER_PERMISSIONS.ADMIN,
            'manage_server': this.admin >= USER_PERMISSIONS.SUPER_ADMIN
        };

        return permissions[action] || false;
    }

    /**
     * Add a buddy to the user's buddy list
     * @param {Object} buddy - {uid, nickname}
     * @returns {boolean} - true if added, false if already exists
     */
    addBuddy(buddy) {
        if (!this.buddies.find(b => b.uid === buddy.uid)) {
            this.buddies.push({
                uid: buddy.uid,
                nickname: buddy.nickname
            });
            
            logger.logUserAction('buddy_added', this.uid, {
                buddyUid: buddy.uid,
                buddyNickname: buddy.nickname
            });
            
            return true;
        } else {
            // Log when buddy already exists
            logger.debug('Buddy already exists in user buddy list', {
                userId: this.uid,
                userNickname: this.nickname,
                buddyUid: buddy.uid,
                buddyNickname: buddy.nickname,
                currentBuddyCount: this.buddies.length,
                existingBuddies: this.buddies.map(b => ({ uid: b.uid, nickname: b.nickname }))
            });
            return false;
        }
    }

    /**
     * Remove a buddy from the user's buddy list
     * @param {number} buddyUid 
     * @returns {boolean} - true if removed, false if not found
     */
    removeBuddy(buddyUid) {
        const index = this.buddies.findIndex(b => b.uid === buddyUid);
        if (index !== -1) {
            const removed = this.buddies.splice(index, 1)[0];
            
            logger.logUserAction('buddy_removed', this.uid, {
                buddyUid: removed.uid,
                buddyNickname: removed.nickname
            });
            
            return true;
        }
        return false;
    }

    /**
     * Check if a user is in buddy list
     * @param {number} buddyUid 
     * @returns {boolean}
     */
    hasBuddy(buddyUid) {
        return this.buddies.some(b => b.uid === buddyUid);
    }

    /**
     * Block a user
     * @param {Object} user - {uid, nickname}
     */
    blockUser(user) {
        if (!this.blocked.find(b => b.uid === user.uid)) {
            this.blocked.push({
                uid: user.uid,
                nickname: user.nickname
            });
            
            logger.logUserAction('user_blocked', this.uid, {
                blockedUid: user.uid,
                blockedNickname: user.nickname
            });
        }
    }

    /**
     * Unblock a user
     * @param {number} userUid 
     */
    unblockUser(userUid) {
        const index = this.blocked.findIndex(b => b.uid === userUid);
        if (index !== -1) {
            const unblocked = this.blocked.splice(index, 1)[0];
            
            logger.logUserAction('user_unblocked', this.uid, {
                unblockedUid: unblocked.uid,
                unblockedNickname: unblocked.nickname
            });
        }
    }

    /**
     * Check if a user is blocked
     * @param {number} userUid 
     * @returns {boolean}
     */
    isBlocked(userUid) {
        return this.blocked.some(b => b.uid === userUid);
    }

    /**
     * Get user data for database storage
     * @returns {Object}
     */
    getDatabaseData() {
        return {
            uid: this.uid,
            nickname: this.nickname,
            email: this.email,
            first: this.firstName,
            last: this.lastName,
            privacy: this.privacy,
            verified: this.verified,
            random: this.random,
            paid1: this.paid1,
            admin: this.admin,
            banners: this.banners,
            listed: this.listed,
            color: this.color,
            buddies: JSON.stringify(this.buddies),
            blocked: JSON.stringify(this.blocked),
            last_login: new Date().toISOString()
        };
    }

    /**
     * Get user data for sending to client
     * @returns {string}
     */
    getClientData() {
        return Utils.objectToKeyValueString({
            uid: this.uid,
            nickname: this.nickname,
            paid1: this.paid1,
            banners: this.banners,
            random: this.random,
            admin: this.admin,
            ph: 0,
            get_offers_from_us: 0,
            get_offers_from_affiliates: 0,
            first: this.firstName,
            last: this.lastName,
            email: this.email,
            privacy: this.privacy,
            verified: 'G',
            insta: 6,
            pub: 200,
            vad: 4,
            target: `${this.uid},${this.nickname}&age:0&gender:-`,
            ip: '127.0.0.1',
            sson: 'Y',
            dpp: 'N',
            vq: 21,
            ka: 'YY',
            sr: 'C',
            ask: 'Y;askpbar.dll;{F4D76F01-7896-458a-890F-E1F05C46069F}',
            cr: 'US',
            rel: 'beta:301,302'
        });
    }

    /**
     * Get summary info for web UI
     * @returns {Object}
     */
    getSummary() {
        return {
            uid: this.uid,
            nickname: this.nickname,
            email: this.email,
            isOnline: this.isOnline(),
            mode: this.mode,
            isAdmin: this.isAdmin(),
            currentRoom: this.currentRoom,
            currentRooms: this.getRoomIds(), // Include all rooms user is in
            roomCount: this.getRoomCount(), // Number of rooms user is in
            loginTime: this.loginTime,
            sessionId: this.sessionId,
            buddyCount: this.buddies.length,
            blockedCount: this.blocked.length,
            paid1: this.paid1, // Include paid status (Y=Premium, 6=Extreme, 0=Basic)
            admin: this.admin, // Include admin level
            created: this.created,
            lastLogin: this.lastLogin,
            firstName: this.firstName,
            lastName: this.lastName,
            listed: this.listed
        };
    }
}

module.exports = User;
