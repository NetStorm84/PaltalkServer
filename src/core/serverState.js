/**
 * Server state manager - centralized state management for the Paltalk server
 */
const EventEmitter = require('events');
const User = require('../models/User');
const Room = require('../models/Room');
const logger = require('../utils/logger');
const { USER_MODES } = require('../config/constants');

class ServerState extends EventEmitter {
    constructor() {
        super();
        this.users = new Map(); // uid -> User
        this.rooms = new Map(); // roomId -> Room
        this.categories = new Map(); // categoryCode -> Category
        this.sockets = new Map(); // socketId -> {user, socket}
        this.offlineMessages = new Map(); // receiverUid -> Array of messages
        this.serverStartTime = new Date();
        
        // Server statistics
        this.stats = {
            totalConnections: 0,
            totalLoginAttempts: 0,
            totalRoomsCreated: 0,
            totalMessagesProcessed: 0,
            totalUniqueUsers: 0,
            lastActivity: new Date()
        };
    }

    /**
     * Add a user connection
     * @param {Socket} socket 
     * @param {User} user 
     */
    addUserConnection(socket, user) {
        try {
            // Store user and socket mapping
            this.users.set(user.uid, user);
            this.sockets.set(socket.id, { user, socket });
            
            // Set user's socket reference
            user.socket = socket;
            
            // Update statistics
            this.stats.totalConnections++;
            this.stats.lastActivity = new Date();
            
            // Count unique users
            this.stats.totalUniqueUsers = this.users.size;
            
            logger.info('User connection added', {
                uid: user.uid,
                nickname: user.nickname,
                socketId: socket.id,
                totalUsers: this.users.size
            });
            
            // Emit user connected event
            this.emit('userConnected', { user, socket });
            
            return true;
        } catch (error) {
            logger.error('Failed to add user connection', error, {
                uid: user?.uid,
                socketId: socket?.id
            });
            return false;
        }
    }

    /**
     * Remove a user connection
     * @param {number|Socket} socketOrUid 
     */
    removeUserConnection(socketOrUid, reason = 'Connection ended') {
        try {
            let user, socketId;

            if (typeof socketOrUid === 'object') {
                // It's a socket
                socketId = socketOrUid.id;
                const connection = this.sockets.get(socketId);
                user = connection?.user;
            } else {
                // It's a UID
                user = this.users.get(socketOrUid);
                socketId = user?.socket?.id;
            }

            if (!user) {
                logger.debug('removeUserConnection called but no user found', { 
                    socketId, 
                    uid: typeof socketOrUid === 'number' ? socketOrUid : 'N/A',
                    reason 
                });
                return false;
            }

            // Check if user is already offline to prevent double cleanup
            if (user.mode === USER_MODES.OFFLINE) {
                logger.debug('User already offline, skipping cleanup', { 
                    uid: user.uid, 
                    socketId,
                    reason 
                });
                return false;
            }

            // Remove from all rooms user is in
            const userRoomIds = user.getRoomIds();
            userRoomIds.forEach(roomId => {
                const room = this.rooms.get(roomId);
                if (room) {
                    room.removeUser(user);
                    
                    // Auto-delete temporary rooms (NOT permanent database rooms)
                    if (room.shouldAutoDelete()) {
                        logger.warn('Attempting to auto-delete room during user cleanup', { 
                            roomId: room.id, 
                            roomName: room.name,
                            isPermanent: room.isPermanent,
                            userCount: room.users.size,
                            reason: 'user disconnection'
                        });
                        
                        // Only delete if it's truly a temporary room (not from database)
                        if (!room.isPermanent) {
                            this.removeRoom(room.id);
                            logger.info('Auto-deleted temporary room during user cleanup', { 
                                roomId: room.id, 
                                roomName: room.name 
                            });
                        } else {
                            logger.warn('Prevented auto-deletion of permanent room during user cleanup', { 
                                roomId: room.id, 
                                roomName: room.name 
                            });
                        }
                    }
                }
            });

            // Set user mode to offline
            user.setMode(USER_MODES.OFFLINE);

            // Remove from collections
            this.users.delete(user.uid);
            if (socketId) {
                this.sockets.delete(socketId);
            }

            // Clear user's socket reference
            user.socket = null;

            // Update statistics
            this.stats.totalUniqueUsers = this.users.size;
            this.stats.lastActivity = new Date();

            logger.info('User connection removed', {
                uid: user.uid,
                nickname: user.nickname,
                reason,
                totalUsers: this.users.size
            });

            // Emit user disconnected event
            this.emit('userDisconnected', { user, reason });

            return true;
        } catch (error) {
            logger.error('Failed to remove user connection', error, {
                socketOrUid: typeof socketOrUid === 'object' ? socketOrUid.id : socketOrUid,
                reason
            });
            return false;
        }
    }

    /**
     * Get user by UID
     * @param {number} uid 
     * @returns {User|null}
     */
    getUser(uid) {
        return this.users.get(uid) || null;
    }

    /**
     * Get user by socket ID
     * @param {string} socketId 
     * @returns {User|null}
     */
    getUserBySocketId(socketId) {
        const connection = this.sockets.get(socketId);
        return connection?.user || null;
    }

    /**
     * Get user by nickname
     * @param {string} nickname 
     * @returns {User|null}
     */
    getUserByNickname(nickname) {
        return Array.from(this.users.values()).find(user => 
            user.nickname.toLowerCase() === nickname.toLowerCase()
        ) || null;
    }

    /**
     * Get all online users
     * @returns {Array<User>}
     */
    getAllUsers() {
        return Array.from(this.users.values());
    }

    /**
     * Get all online users (alias for getAllUsers for compatibility)
     * @returns {Array<User>}
     */
    getOnlineUsers() {
        return this.getAllUsers();
    }

    /**
     * Get user activity summary for dashboard
     * @returns {Array<Object>}
     */
    getUserActivitySummary() {
        const users = this.getOnlineUsers();
        return users.map(user => ({
            uid: user.uid,
            nickname: user.nickname,
            loginTime: user.loginTime,
            lastActivity: user.lastActivity,
            roomCount: user.getRoomCount(),
            isAdmin: user.isAdmin()
        }));
    }

    /**
     * Get recent activities for activity feed
     * @param {number} limit 
     * @returns {Array<Object>}
     */
    getRecentActivities(limit = 50) {
        // Return a simple activity feed for now
        // This could be enhanced to track actual activities in a more sophisticated way
        const activities = [];
        
        // Add recent user connections
        this.getOnlineUsers().forEach(user => {
            activities.push({
                type: 'user_connected',
                timestamp: user.loginTime,
                user: {
                    uid: user.uid,
                    nickname: user.nickname
                }
            });
        });
        
        // Sort by timestamp and limit
        return activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    /**
     * Add a room
     * @param {Room} room 
     */
    addRoom(room) {
        try {
            // Inject server state reference into room
            room.setServerState(this);
            
            this.rooms.set(room.id, room);
            this.stats.totalRoomsCreated++;
            this.stats.lastActivity = new Date();
            
            logger.info('Room added', {
                roomId: room.id,
                roomName: room.name,
                isPermanent: room.isPermanent,
                totalRooms: this.rooms.size
            });
            
            // Emit room added event
            this.emit('roomAdded', { room });
            
            return true;
        } catch (error) {
            logger.error('Failed to add room', error, {
                roomId: room?.id,
                roomName: room?.name
            });
            return false;
        }
    }

    /**
     * Remove a room
     * @param {number} roomId 
     */
    removeRoom(roomId) {
        try {
            const room = this.rooms.get(roomId);
            if (!room) {
                logger.warn('Attempted to remove non-existent room', { roomId });
                return false;
            }

            // Remove all users from room first
            const userIds = Array.from(room.users.keys());
            userIds.forEach(userId => {
                const user = this.getUser(userId);
                if (user) {
                    room.removeUser(user);
                }
            });

            // Remove room from collection
            this.rooms.delete(roomId);
            this.stats.lastActivity = new Date();

            logger.info('Room removed', {
                roomId: room.id,
                roomName: room.name,
                totalRooms: this.rooms.size
            });

            // Emit room removed event
            this.emit('roomRemoved', { room });

            return true;
        } catch (error) {
            logger.error('Failed to remove room', error, { roomId });
            return false;
        }
    }

    /**
     * Get room by ID
     * @param {number} roomId 
     * @returns {Room|null}
     */
    getRoom(roomId) {
        return this.rooms.get(roomId) || null;
    }

    /**
     * Get all rooms
     * @returns {Array<Room>}
     */
    getAllRooms() {
        return Array.from(this.rooms.values());
    }

    /**
     * Get rooms by category code - with special handling for Top Rooms
     * @param {number} categoryCode 
     * @returns {Array<Room>}
     */
    getRoomsByCategory(categoryCode) {
        // Special handling for Top Rooms category (30001)
        // Return top 20 rooms by user count regardless of their original category
        if (categoryCode === 30001) {
            return Array.from(this.rooms.values())
                .sort((a, b) => b.getUserCount() - a.getUserCount()) // Sort by user count descending
                .slice(0, 20); // Take top 20
        }
        
        // For all other categories, filter by category code as usual
        return Array.from(this.rooms.values()).filter(room => 
            room.category === categoryCode
        );
    }

    /**
     * Add a category
     * @param {Object} category 
     */
    addCategory(category) {
        this.categories.set(category.code, category);
    }

    /**
     * Get all categories
     * @returns {Array<Object>}
     */
    getAllCategories() {
        return Array.from(this.categories.values());
    }

    /**
     * Store an offline message
     * @param {number} senderUid 
     * @param {number} receiverUid 
     * @param {string} message 
     */
    storeOfflineMessage(senderUid, receiverUid, message) {
        try {
            if (!this.offlineMessages.has(receiverUid)) {
                this.offlineMessages.set(receiverUid, []);
            }

            const messageData = {
                senderUid,
                message,
                timestamp: new Date(),
                id: Date.now() + Math.random()
            };

            this.offlineMessages.get(receiverUid).push(messageData);

            logger.debug('Offline message stored', {
                senderUid,
                receiverUid,
                messageLength: message.length
            });

            return true;
        } catch (error) {
            logger.error('Failed to store offline message', error, {
                senderUid,
                receiverUid
            });
            return false;
        }
    }

    /**
     * Get and clear offline messages for a user
     * @param {number} uid 
     * @returns {Array}
     */
    getOfflineMessages(uid) {
        try {
            const messages = this.offlineMessages.get(uid) || [];
            this.offlineMessages.delete(uid);

            logger.debug('Retrieved offline messages', {
                uid,
                messageCount: messages.length
            });

            return messages;
        } catch (error) {
            logger.error('Failed to get offline messages', error, { uid });
            return [];
        }
    }

    /**
     * Search users by nickname pattern
     * @param {string} pattern 
     * @param {number} limit 
     * @returns {Array<User>}
     */
    searchUsers(pattern, limit = 50) {
        try {
            const regex = new RegExp(pattern, 'i');
            return Array.from(this.users.values())
                .filter(user => regex.test(user.nickname))
                .slice(0, limit);
        } catch (error) {
            logger.error('Failed to search users', error, { pattern, limit });
            return [];
        }
    }

    /**
     * Get server statistics
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            currentUsers: this.users.size,
            currentRooms: this.rooms.size,
            uptime: Date.now() - this.serverStartTime.getTime(),
            memory: process.memoryUsage()
        };
    }

    /**
     * Get room statistics
     * @returns {Object}
     */
    getRoomStatistics() {
        const rooms = Array.from(this.rooms.values());
        const totalUsers = rooms.reduce((sum, room) => sum + room.getUserCount(), 0);
        
        return {
            totalRooms: rooms.length,
            totalUsersInRooms: totalUsers,
            averageUsersPerRoom: rooms.length > 0 ? (totalUsers / rooms.length).toFixed(2) : 0,
            emptyRooms: rooms.filter(room => room.getUserCount() === 0).length,
            mostPopularRoom: rooms.reduce((max, room) => 
                room.getUserCount() > (max?.getUserCount() || 0) ? room : max, null
            ),
            roomsByCategory: rooms.reduce((acc, room) => {
                acc[room.category] = (acc[room.category] || 0) + 1;
                return acc;
            }, {})
        };
    }

    /**
     * Get user activity summary
     * @returns {Object}
     */
    getUserActivitySummary() {
        const users = Array.from(this.users.values());
        
        return {
            totalOnlineUsers: users.length,
            usersByMode: users.reduce((acc, user) => {
                acc[user.mode] = (acc[user.mode] || 0) + 1;
                return acc;
            }, {}),
            usersInRooms: users.filter(user => user.getRoomIds().length > 0).length,
            usersInMultipleRooms: users.filter(user => user.getRoomIds().length > 1).length
        };
    }

    /**
     * Ban a user from the server
     * @param {number} uid 
     * @param {string} reason 
     * @param {number} duration - Duration in minutes (0 = permanent)
     */
    banUser(uid, reason = 'No reason provided', duration = 0) {
        try {
            const user = this.getUser(uid);
            if (user) {
                user.banned = true;
                user.banReason = reason;
                user.banExpiry = duration > 0 ? Date.now() + (duration * 60000) : null;
                
                logger.info('User banned', {
                    uid,
                    nickname: user.nickname,
                    reason,
                    duration: duration > 0 ? `${duration} minutes` : 'permanent'
                });
                
                // Disconnect the user
                this.removeUserConnection(user.socket, `Banned: ${reason}`);
                
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Failed to ban user', error, { uid, reason });
            return false;
        }
    }

    /**
     * Check if a user is banned
     * @param {number} uid 
     * @returns {boolean}
     */
    isUserBanned(uid) {
        try {
            const user = this.getUser(uid);
            if (!user || !user.banned) return false;
            
            // Check if temporary ban has expired
            if (user.banExpiry && Date.now() > user.banExpiry) {
                user.banned = false;
                user.banReason = null;
                user.banExpiry = null;
                return false;
            }
            
            return true;
        } catch (error) {
            logger.error('Failed to check user ban status', error, { uid });
            return false;
        }
    }

    /**
     * Update server statistics
     * @param {string} statName 
     * @param {number} increment 
     */
    updateStats(statName, increment = 1) {
        try {
            if (this.stats.hasOwnProperty(statName)) {
                this.stats[statName] += increment;
            } else {
                this.stats[statName] = increment;
            }
            this.stats.lastActivity = new Date();
        } catch (error) {
            logger.error('Failed to update stats', error, { statName, increment });
        }
    }

    /**
     * Perform maintenance tasks
     */
    performMaintenance() {
        try {
            this.cleanupExpiredBans();
            this.cleanupEmptyTemporaryRooms();
            logger.debug('Maintenance completed');
        } catch (error) {
            logger.error('Failed to perform maintenance', error);
        }
    }

    /**
     * Start periodic cleanup tasks
     */
    startPeriodicTasks() {
        // Clean up expired bans every 5 minutes
        setInterval(() => {
            this.cleanupExpiredBans();
        }, 5 * 60 * 1000);

        // Clean up empty temporary rooms every 10 minutes
        setInterval(() => {
            this.cleanupEmptyTemporaryRooms();
        }, 10 * 60 * 1000);

        logger.info('Periodic cleanup tasks started');
    }

    /**
     * Clean up expired bans
     */
    cleanupExpiredBans() {
        try {
            const users = Array.from(this.users.values());
            let cleanedCount = 0;

            users.forEach(user => {
                if (user.banned && user.banExpiry && Date.now() > user.banExpiry) {
                    user.banned = false;
                    user.banReason = null;
                    user.banExpiry = null;
                    cleanedCount++;
                }
            });

            if (cleanedCount > 0) {
                logger.info('Cleaned up expired bans', { count: cleanedCount });
            }
        } catch (error) {
            logger.error('Failed to cleanup expired bans', error);
        }
    }

    /**
     * Clean up empty temporary rooms
     */
    cleanupEmptyTemporaryRooms() {
        try {
            const rooms = Array.from(this.rooms.values());
            let cleanedCount = 0;

            rooms.forEach(room => {
                if (!room.isPermanent && room.shouldAutoDelete()) {
                    this.removeRoom(room.id);
                    cleanedCount++;
                }
            });

            if (cleanedCount > 0) {
                logger.info('Cleaned up empty temporary rooms', { count: cleanedCount });
            }
        } catch (error) {
            logger.error('Failed to cleanup empty temporary rooms', error);
        }
    }

    /**
     * Clean up any disconnected users or bot users that might remain in the system
     * This is particularly useful after stopping bots
     */
    cleanupDisconnectedUsers() {
        try {
            let cleanedCount = 0;
            
            // Check all users and remove those without sockets or with disconnected sockets
            for (const [uid, user] of this.users.entries()) {
                // Check if user is a disconnected bot or has no socket
                if (!user.socket || (user.socket && !this.sockets.has(user.socket.id))) {
                    // Remove user from all rooms first
                    if (user.currentRooms && user.currentRooms.size > 0) {
                        const roomIds = [...user.currentRooms]; // Create a copy to prevent modification during iteration
                        for (const roomId of roomIds) {
                            const room = this.getRoom(roomId);
                            if (room) {
                                room.removeUser(user);
                                
                                // If room is temporary and now empty, consider removing it
                                if (!room.isPermanent && room.getUserCount() === 0) {
                                    this.deleteRoom(room.id);
                                }
                            }
                        }
                    }
                    
                    // Remove the user from the users map
                    this.users.delete(uid);
                    cleanedCount++;
                }
            }
            
            // Update statistics
            this.stats.totalUniqueUsers = this.users.size;
            
            if (cleanedCount > 0) {
                logger.info('Cleaned up disconnected users', { cleanedCount });
                
                // Emit event for any listeners
                this.emit('usersCleanedUp', { count: cleanedCount });
            }
            
            return cleanedCount;
        } catch (error) {
            logger.error('Failed to clean up disconnected users', error);
            return 0;
        }
    }

    /**
     * Perform startup cleanup to ensure clean server state
     * This fixes issues with stale user/room state from previous server runs
     */
    performStartupCleanup() {
        try {
            logger.info('🧹 Performing startup cleanup...');
            
            // Clear all users (they should reconnect after server restart)
            const userCount = this.users.size;
            this.users.clear();
            this.sockets.clear();
            
            // Clean up room state - remove all users from rooms but keep permanent rooms
            let totalUsersRemoved = 0;
            this.rooms.forEach(room => {
                const roomUserCount = room.users.size;
                totalUsersRemoved += roomUserCount;
                
                // Clear all users from the room
                room.users.clear();
                
                // Reset room user counts
                if (room.resetUserCount) {
                    room.resetUserCount();
                }
            });
            
            // Remove non-permanent rooms (they'll be recreated as needed)
            const tempRooms = Array.from(this.rooms.values()).filter(room => !room.isPermanent);
            tempRooms.forEach(room => {
                this.rooms.delete(room.id);
            });
            
            logger.info('✅ Startup cleanup completed', {
                usersCleared: userCount,
                usersRemovedFromRooms: totalUsersRemoved,
                temporaryRoomsRemoved: tempRooms.length,
                permanentRoomsRetained: this.rooms.size
            });
            
        } catch (error) {
            logger.error('Failed to perform startup cleanup', error);
        }
    }
}

// Create singleton instance
const serverState = new ServerState();

module.exports = serverState;
