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
        this.micEnabled = roomData.mike !== undefined ? roomData.mike : (roomData.micEnabled !== undefined ? roomData.micEnabled : 1);
        this.textEnabled = roomData.text !== undefined ? roomData.text : (roomData.textEnabled !== undefined ? roomData.textEnabled : 1);
        this.allowAllMics = roomData.allowAllMics !== undefined ? roomData.allowAllMics : true; // Allow all users to use mic by default
        
        // Runtime properties
        this.users = new Map(); // uid -> user object
        this.bannedUsers = new Set();
        this.isPermanent = isPermanent;
        this.createdAt = new Date();
        this.createdBy = roomData.createdBy || roomData.owner || null;
        this.statusMessage = '';
        this.isClosed = Boolean(roomData.isClosed); // Room closed status - hidden from lists but admins can join
        
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
                    nickname: user.nickname,
                    roomId: this.id,
                    roomName: this.name,
                    currentUsersInRoom: Array.from(this.users.keys()),
                    currentUserNicknames: Array.from(this.users.values()).map(u => u.nickname)
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

            // Implement automatic mic permissions logic
            let micPermission = 0;
            if (this.isVoice) {
                if (isAdmin) {
                    // Admins always get mic in voice rooms
                    micPermission = 1;
                } else if (this.micEnabled === 1) {
                    // Auto mic enabled for new users in this voice room
                    micPermission = 1;
                } else {
                    // Manual mic only - users must request mic
                    micPermission = 0;
                }
            } else {
                // Text rooms never grant mic permissions
                micPermission = 0;
            }

            // Update user's mic status
            user.mic = micPermission;

            const userRoomData = {
                uid: user.uid,
                nickname: user.nickname,
                admin: isAdmin ? 1 : user.admin,
                color: user.color,
                mic: micPermission,
                pub: user.pub,
                away: user.away,
                visible: isVisible,
                joinedAt: new Date(),
                isRoomAdmin: isAdmin
            };

            this.users.set(user.uid, userRoomData);
            
            // Use the new multiple room tracking methods if the user object has them
            // This handles both User instances (with methods) and plain objects (bots might use)
            if (typeof user.addToRoom === 'function') {
                user.addToRoom(this.id);
            } else {
                logger.debug('User object does not have addToRoom method', {
                    userId: user.uid,
                    userType: typeof user,
                    hasMethod: typeof user.addToRoom,
                    isBot: user.isBot
                });
            }

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
                
                // NOTE: Broadcasting is now handled by PacketProcessor.handleRoomJoin()
                // to prevent duplicate broadcasts that can cause client disconnections
                logger.debug('User added to room - broadcasting handled by PacketProcessor', {
                    roomId: this.id,
                    roomName: this.name,
                    userUid: user.uid,
                    userNickname: user.nickname
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
        if (actualUser && typeof actualUser.removeFromRoom === 'function') {
            actualUser.removeFromRoom(this.id);
        } else {
            logger.debug('User object does not have removeFromRoom method', {
                userId: uid,
                userType: actualUser ? typeof actualUser : 'undefined',
                isBot: actualUser?.isBot || false
            });
        }

        this.users.delete(uid);

        logger.info('User removed from room', {
            roomId: this.id,
            roomName: this.name,
            userId: uid,
            nickname: user.nickname,
            remainingUserCount: this.users.size,
            hasServerState: !!this.serverState,
            hasPacketProcessor: !!this.serverState?.packetProcessor
        });

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
            
            // NOTE: Broadcasting is now handled by PacketProcessor.handleRoomLeave()
            // to prevent duplicate broadcasts that can cause client disconnections
            logger.debug('User removed from room - broadcasting handled by PacketProcessor', {
                roomId: this.id,
                roomName: this.name,
                uid: uid,
                nickname: user.nickname
            });
        }

        return true;
    }

    /**
     * Close the room - hides it from room lists but keeps it accessible to admins
     * @param {number} closedByUid - UID of user who closed the room
     */
    async closeRoom(closedByUid) {
        this.isClosed = true;
        
        // Persist to database if this is a permanent room
        if (this.isPermanent && this.serverState && this.serverState.databaseManager) {
            try {
                await this.serverState.databaseManager.updateRoom(this.id, { isClosed: true });
                logger.info('Room closed status persisted to database', {
                    roomId: this.id,
                    roomName: this.name
                });
            } catch (error) {
                logger.error('Failed to persist room closed status to database', error, {
                    roomId: this.id,
                    roomName: this.name,
                    closedBy: closedByUid
                });
            }
        }
        
        logger.logRoomActivity('room_closed', this.id, closedByUid, {
            roomName: this.name
        });
        
        logger.info('Room closed', {
            roomId: this.id,
            roomName: this.name,
            closedBy: closedByUid
        });
    }    /**
     * Reopen the room - makes it visible in room lists again
     * @param {number} reopenedByUid - UID of user who reopened the room
     */
    async reopenRoom(reopenedByUid) {
        logger.info('Room reopening initiated', {
            roomId: this.id,
            roomName: this.name,
            currentlyClosedState: this.isClosed,
            reopenedBy: reopenedByUid,
            thisReference: typeof this,
            objectId: this.constructor.name + '_' + this.id
        });

        // CRITICAL DEBUG: Check the room state before modification
        const stateBeforeUpdate = this.isClosed;
        
        this.isClosed = false;
        
        // CRITICAL DEBUG: Verify state was actually changed
        const stateAfterUpdate = this.isClosed;
        logger.info('Room state update verification', {
            roomId: this.id,
            roomName: this.name,
            stateBeforeUpdate,
            stateAfterUpdate,
            updateSuccessful: stateAfterUpdate === false,
            reopenedBy: reopenedByUid
        });
        
        // Persist to database if this is a permanent room
        if (this.isPermanent && this.serverState && this.serverState.databaseManager) {
            try {
                await this.serverState.databaseManager.updateRoom(this.id, { isClosed: false });
                logger.info('Room reopened status persisted to database', {
                    roomId: this.id,
                    roomName: this.name
                });
            } catch (error) {
                logger.error('Failed to persist room reopened status to database', error, {
                    roomId: this.id,
                    roomName: this.name,
                    reopenedBy: reopenedByUid
                });
                // CRITICAL: If database update fails, should we revert the in-memory state?
                // For now, we'll keep the in-memory state as reopened even if DB fails
            }
        }
        
        logger.logRoomActivity('room_reopened', this.id, reopenedByUid, {
            roomName: this.name
        });

        // FINAL VERIFICATION: Check state one more time after everything
        logger.info('Room reopened successfully - final verification', {
            roomId: this.id,
            roomName: this.name,
            finalClosedState: this.isClosed,
            reopenSuccessful: !this.isClosed,
            reopenedBy: reopenedByUid,
            isPermanent: this.isPermanent,
            hasServerState: !!this.serverState,
            hasDatabaseManager: !!(this.serverState && this.serverState.databaseManager)
        });
    }

    /**
     * Check if room is accessible to a user
     * @param {Object} user - User object
     * @returns {boolean}
     */
    isAccessibleTo(user) {
        // If room is not closed, it's accessible to everyone
        if (!this.isClosed) {
            return true;
        }
        
        // Debug logging for closed room access checks
        const isGlobalAdmin = user && user.isAdmin && user.isAdmin();
        const isRoomOwner = user && this.createdBy === user.uid;
        
        // Enhanced debugging for room 50001
        if (this.id === 50001) {
            logger.info('DEBUG: Room 50001 accessibility check', {
                roomId: this.id,
                roomName: this.name,
                isClosed: this.isClosed,
                userId: user?.uid,
                userNickname: user?.nickname,
                isGlobalAdmin,
                isRoomOwner,
                roomCreatedBy: this.createdBy,
                userHasIsAdminMethod: user && typeof user.isAdmin === 'function',
                rawUserObject: user ? {
                    uid: user.uid,
                    nickname: user.nickname,
                    admin: user.admin,
                    isAdminResult: user.isAdmin ? user.isAdmin() : 'method_not_available'
                } : null,
                finalResult: isGlobalAdmin || isRoomOwner
            });
        }
        
        logger.debug('Room accessibility check', {
            roomId: this.id,
            roomName: this.name,
            isClosed: this.isClosed,
            userId: user?.uid,
            isGlobalAdmin,
            isRoomOwner,
            accessible: isGlobalAdmin || isRoomOwner
        });
        
        // If room is closed, only admins and room owners can access it
        return isGlobalAdmin || isRoomOwner;
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
            'R': 'This is an R rated room for teens and adults. Some mature content is permitted.'
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
            channels: 1, // 1 or 0 - single mic or multimic?
            premium: 1,
            size: 468, // max amount of users?
            va: 'Y',
            ss: 'F',
            own: 'NetStorm', // owners nickname
            cr: '56958546', // creators UID
            sr: 0, // 0 or 1, not sure what it means, private/public?
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
