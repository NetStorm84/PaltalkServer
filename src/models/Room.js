/**
 * Enhanced Room model with better functionality and voice support
 */
const Utils = require('../utils/utils');
const logger = require('../utils/logger');
const { ROOM_TYPES } = require('../config/constants');

class Room {
    constructor(roomData, isPermanent = false) {
        this.id = roomData.id;
        this.name = roomData.nm || roomData.name;
        this.category = roomData.catg || roomData.category;
        this.rating = roomData.r || roomData.rating || 'G';
        this.isVoice = roomData.v || roomData.isVoice || ROOM_TYPES.TEXT;
        this.isPrivate = roomData.p || roomData.isPrivate || 0;
        this.isLocked = roomData.l || roomData.isLocked || 0; // 0=not locked, 1=locked (password required)
        this.topic = roomData.topic || 'Welcome to the room!';
        this.password = roomData.password || '';
        this.maxUsers = roomData.maxUsers || 100;
        this.color = roomData.c || roomData.color || '000000000';
        
        // Voice settings
        this.micEnabled = roomData.mike || roomData.micEnabled || 1;
        this.textEnabled = roomData.text || roomData.textEnabled || 1;
        this.allowAllMics = roomData.allowAllMics !== undefined ? roomData.allowAllMics : true; // Allow all users to use mic by default
        
        // Runtime properties
        this.users = new Map(); // uid -> user object
        this.bannedUsers = new Set();
        this.isPermanent = isPermanent;
        this.createdAt = new Date();
        this.createdBy = roomData.createdBy || roomData.owner || null;
        this.statusMessage = '';
        
        // Voice server info
        this.voiceServerIP = roomData.voiceServerIP || '127.0.0.1';
        this.voiceServerPort = roomData.voiceServerPort || 2090;
        
        // Server state reference for user management
        this.serverState = null; // Will be injected later
    }

    /**
     * Inject server state reference
     * @param {ServerState} serverState 
     */
    setServerState(serverState) {
        this.serverState = serverState;
    }

    /**
     * Add a user to the room
     * @param {User} user - User object to add
     * @param {boolean} isVisible - Whether user should be visible in user list
     * @param {boolean} isAdmin - Whether user joins as admin
     * @returns {boolean} - Success status
     */
    addUser(user, isVisible = true, isAdmin = false) {
        try {
            if (this.users.has(user.uid)) {
                logger.warn('User already in room', { 
                    userId: user.uid, 
                    roomId: this.id
                });
                return false;
            }

            // Check room capacity
            if (this.users.size >= this.maxUsers) {
                logger.warn('Room at capacity', { 
                    roomId: this.id, 
                    maxUsers: this.maxUsers,
                    currentUsers: this.users.size
                });
                return false;
            }

            // Check if user is banned
            if (this.bannedUsers.has(user.uid)) {
                logger.warn('Banned user attempted to join', { 
                    userId: user.uid, 
                    roomId: this.id
                });
                return false;
            }

            // Check password if room is private
            if (this.isPrivate && this.password && !isAdmin) {
                // Password checking should be done before calling this method
                // This is just a safety check
            }

            const userRoomData = {
                uid: user.uid,
                nickname: user.nickname,
                admin: isAdmin ? 1 : user.admin,
                color: user.color,
                mic: user.mic,
                pub: user.pub,
                away: user.away,
                visible: isVisible,
                joinedAt: new Date(),
                isRoomAdmin: isAdmin
            };

            this.users.set(user.uid, userRoomData);
            
            // Use the new multiple room tracking methods
            user.addToRoom(this.id);

            logger.logUserAction('room_join', user.uid, {
                roomId: this.id,
                roomName: this.name,
                isAdmin,
                isVisible
            });

            // Emit real-time event for dashboard updates
            if (this.serverState) {
                this.serverState.emit('userJoinedRoom', {
                    user: user,
                    room: this,
                    isAdmin,
                    isVisible
                });
            }

            return true;
        } catch (error) {
            logger.error('Error adding user to room', error, {
                userId: user.uid,
                roomId: this.id
            });
            return false;
        }
    }

    /**
     * Remove a user from the room
     * @param {number|User} userOrUid - User object or UID
     * @returns {boolean} - Success status
     */
    removeUser(userOrUid) {
        const uid = typeof userOrUid === 'object' ? userOrUid.uid : userOrUid;
        const user = this.users.get(uid);
        
        if (!user) {
            return false;
        }

        // Get the actual user object to call removeFromRoom
        const actualUser = typeof userOrUid === 'object' ? userOrUid : (this.serverState?.getUser(uid));
        if (actualUser) {
            actualUser.removeFromRoom(this.id);
        }

        this.users.delete(uid);

        logger.logRoomActivity('user_left', this.id, uid, {
            nickname: user.nickname,
            userCount: this.users.size
        });

        // Emit real-time event for dashboard updates
        if (this.serverState) {
            this.serverState.emit('userLeftRoom', {
                uid: uid,
                room: this,
                nickname: user.nickname
            });
        }

        return true;
    }

    /**
     * Get all visible users in the room
     * @returns {Array<User>}
     */
    getVisibleUsers() {
        return Array.from(this.users.values()).filter(user => user.visible);
    }

    /**
     * Get all users in the room (including invisible)
     * @returns {Array<User>}
     */
    getAllUsers() {
        return Array.from(this.users.values());
    }

    /**
     * Get user count (visible users only)
     * @returns {number}
     */
    getUserCount() {
        return this.getVisibleUsers().length;
    }

    /**
     * Get a user by UID
     * @param {number} uid 
     * @returns {User|null}
     */
    getUser(uid) {
        return this.users.get(uid) || null;
    }

    /**
     * Check if user is in room
     * @param {number} uid 
     * @returns {boolean}
     */
    hasUser(uid) {
        return this.users.has(uid);
    }

    /**
     * Ban a user from the room
     * @param {number} uid 
     */
    banUser(uid) {
        this.bannedUsers.add(uid);
        this.removeUser(uid);
        
        logger.logRoomActivity('user_banned', this.id, uid);
    }

    /**
     * Unban a user from the room
     * @param {number} uid 
     */
    unbanUser(uid) {
        this.bannedUsers.delete(uid);
        
        logger.logRoomActivity('user_unbanned', this.id, uid);
    }

    /**
     * Check if user is banned
     * @param {number} uid 
     * @returns {boolean}
     */
    isUserBanned(uid) {
        return this.bannedUsers.has(uid);
    }

    /**
     * Set room topic/banner message
     * @param {string} message 
     * @param {number} setByUid 
     */
    setTopic(message, setByUid) {
        this.topic = message;
        
        logger.logRoomActivity('topic_changed', this.id, setByUid, {
            newTopic: message
        });
    }

    /**
     * Set room status message
     * @param {string} message 
     * @param {number} setByUid 
     */
    setStatusMessage(message, setByUid) {
        this.statusMessage = message;
        
        logger.logRoomActivity('status_changed', this.id, setByUid, {
            newStatus: message
        });
    }

    /**
     * Get welcome message based on rating
     * @returns {string}
     */
    getWelcomeMessage() {
        const welcomeMessages = {
            'G': 'This is a G rated room intended for a General Audience including minors. Offensive language is not permitted.',
            'A': 'This is an A rated room not intended for minors. Offensive language is permitted.',
            'T': 'This is a T rated room for teens and adults. Some mature content is permitted.'
        };

        return welcomeMessages[this.rating] || welcomeMessages['G'];
    }

    /**
     * Get room details for client
     * @returns {Object}
     */
    getRoomDetails() {
        return {
            codec: 'spexproj.dll',
            qual: 2,
            channels: 1,
            premium: 1,
            va: 'Y',
            ss: 'F',
            own: 'NetStorm',
            cr: '56958546',
            sr: 0,
            sra: 0,
            sru: 0,
            srf: 0,
            srh: 0
        };
    }

    /**
     * Get room data for database storage
     * @returns {Object}
     */
    getDatabaseData() {
        return {
            id: this.id,
            nm: this.name,
            catg: this.category,
            r: this.rating,
            v: this.isVoice,
            p: this.isPrivate,
            l: this.isLocked,
            topic: this.topic,
            password: this.password,
            maxUsers: this.maxUsers,
            c: this.color,
            mike: this.micEnabled,
            text: this.textEnabled
        };
    }

    /**
     * Get room summary for web UI
     * @returns {Object}
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            category: this.category,
            rating: this.rating,
            isVoice: this.isVoice,
            isPrivate: this.isPrivate,
            isLocked: this.isLocked,
            topic: this.topic,
            userCount: this.getUserCount(),
            maxUsers: this.maxUsers,
            isPermanent: this.isPermanent,
            createdAt: this.createdAt,
            createdBy: this.createdBy,
            statusMessage: this.statusMessage,
            users: this.getVisibleUsers().map(user => ({
                uid: user.uid,
                nickname: user.nickname,
                isAdmin: user.isAdmin(),
                mic: user.mic,
                away: user.away
            }))
        };
    }

    /**
     * Check if room should be automatically deleted
     * @returns {boolean}
     */
    shouldAutoDelete() {
        return !this.isPermanent && this.users.size === 0;
    }
}

module.exports = Room;
