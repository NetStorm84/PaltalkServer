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
        this.paid1 = userData.paid1 || 'N';
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
        this.currentRoom = null;
        this.socket = null;
        this.sessionId = Utils.generateSessionId();
        this.loginTime = new Date();
        
        // Voice/Room properties
        this.mic = 0;
        this.pub = 0;
        this.away = 0;
        this.visible = true;
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
        return this.admin >= USER_PERMISSIONS.ADMIN;
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
        }
        return false;
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
            loginTime: this.loginTime,
            sessionId: this.sessionId,
            buddyCount: this.buddies.length,
            blockedCount: this.blocked.length
        };
    }
}

module.exports = User;
