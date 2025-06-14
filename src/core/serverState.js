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
        this.categories = new Map(); // categoryCode -> category
        this.sockets = new Map(); // socketId -> {user, socket}
        this.offlineMessages = new Map(); // receiverUid -> Array of messages
        this.serverStartTime = new Date();
        this.stats = {
            totalConnections: 0,
            totalPacketsReceived: 0,
            totalPacketsSent: 0,
            totalMessagesProcessed: 0,
            peakConcurrentUsers: 0,
            totalRoomsCreated: 0,
            totalLoginAttempts: 0,
            totalFailedLogins: 0,
            uptime: 0
        };
        
        // Performance monitoring
        this.performanceMetrics = {
            memoryUsage: process.memoryUsage(),
            lastUpdate: Date.now()
        };
        
        // Update performance metrics periodically
        setInterval(() => {
            this.updatePerformanceMetrics();
        }, 30000); // Every 30 seconds
        
        // Activity tracking
        this.recentActivities = [];
        this.maxActivities = 200;
        
        // Banned users tracking
        this.bannedUsers = new Map(); // userId -> {reason, bannedAt, duration}
    }

    /**
     * Add a user connection
     * @param {Socket} socket 
     * @param {User} user 
     */
    addUserConnection(socket, user) {
        try {
            // Set socket properties
            socket.id = user.uid;
            socket.user = user;
            user.socket = socket;
            user.setMode(USER_MODES.ONLINE);

            // Store in maps
            this.users.set(user.uid, user);
            this.sockets.set(socket.id, { user, socket });

            this.stats.totalConnections++;

            logger.logUserAction('connected', user.uid, {
                nickname: user.nickname,
                sessionId: user.sessionId
            });

            this.emit('userConnected', user);
            return true;
        } catch (error) {
            logger.error('Failed to add user connection', error, {
                userId: user?.uid,
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
                    
                    // Auto-delete temporary rooms
                    if (room.shouldAutoDelete()) {
                        this.removeRoom(room.id);
                    }
                }
            });

            // Update user state
            user.setMode(USER_MODES.OFFLINE);
            user.socket = null;
            user.currentRoom = null;

            // Remove from maps
            this.users.delete(user.uid);
            if (socketId) {
                this.sockets.delete(socketId);
            }

            logger.logUserAction('disconnected', user.uid, {
                nickname: user.nickname,
                sessionId: user.sessionId,
                reason: reason
            });

            this.emit('userDisconnected', user);
            return true;
        } catch (error) {
            logger.error('Failed to remove user connection', error);
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
     * Get all online users
     * @returns {Array<User>}
     */
    getOnlineUsers() {
        return Array.from(this.users.values()).filter(user => user.isOnline());
    }

    /**
     * Find users by nickname (partial match)
     * @param {string} nickname 
     * @returns {Array<User>}
     */
    findUsersByNickname(nickname) {
        const searchTerm = nickname.toLowerCase();
        return Array.from(this.users.values()).filter(user => 
            user.nickname.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Add a room
     * @param {Room} room 
     */
    addRoom(room) {
        this.rooms.set(room.id, room);
        
        logger.logRoomActivity('room_created', room.id, room.createdBy, {
            name: room.name,
            category: room.category,
            isVoice: room.isVoice,
            isPermanent: room.isPermanent
        });

        this.stats.totalRoomsCreated++;

        this.emit('roomCreated', room);
    }

    /**
     * Remove a room
     * @param {number} roomId 
     */
    removeRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return false;
        }

        // Remove all users from room
        room.getAllUsers().forEach(user => {
            room.removeUser(user);
        });

        this.rooms.delete(roomId);

        logger.logRoomActivity('room_deleted', roomId, null, {
            name: room.name,
            isPermanent: room.isPermanent
        });

        this.emit('roomDeleted', room);
        return true;
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
     * Get rooms by category
     * @param {number} categoryCode 
     * @returns {Array<Room>}
     */
    getRoomsByCategory(categoryCode) {
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
     * @param {string} content 
     */
    storeOfflineMessage(senderUid, receiverUid, content) {
        if (!this.offlineMessages.has(receiverUid)) {
            this.offlineMessages.set(receiverUid, []);
        }

        this.offlineMessages.get(receiverUid).push({
            id: Date.now() + Math.random(), // Simple ID generation
            sender: senderUid,
            content: content,
            timestamp: new Date(),
            status: 'pending'
        });

        logger.info('Offline message stored', {
            senderUid,
            receiverUid,
            contentLength: content.length
        });
    }

    /**
     * Get offline messages for a user
     * @param {number} uid 
     * @returns {Array<Object>}
     */
    getOfflineMessages(uid) {
        return this.offlineMessages.get(uid) || [];
    }

    /**
     * Clear offline messages for a user
     * @param {number} uid 
     */
    clearOfflineMessages(uid) {
        this.offlineMessages.delete(uid);
    }

    /**
     * Update server statistics
     * @param {string} statName 
     * @param {number} increment 
     */
    updateStats(statName, increment = 1) {
        if (this.stats.hasOwnProperty(statName)) {
            this.stats[statName] += increment;
        }
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        this.performanceMetrics = {
            memoryUsage: process.memoryUsage(),
            lastUpdate: Date.now(),
            cpuUsage: process.cpuUsage()
        };
        
        // Update peak concurrent users
        if (this.users.size > this.stats.peakConcurrentUsers) {
            this.stats.peakConcurrentUsers = this.users.size;
        }
    }

    /**
     * Format uptime in human readable format
     * @param {number} uptimeMs 
     * @returns {string}
     */
    formatUptime(uptimeMs) {
        const seconds = Math.floor(uptimeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m ${seconds % 60}s`;
        }
    }

    /**
     * Get detailed room statistics
     * @returns {Array}
     */
    getRoomStatistics() {
        return Array.from(this.rooms.values()).map(room => ({
            id: room.id,
            name: room.name,
            userCount: room.users.size,
            maxUsers: room.maxUsers,
            isVoice: room.isVoice,
            isPermanent: room.isPermanent,
            createdAt: room.createdAt,
            category: room.category
        }));
    }

    /**
     * Get user activity summary
     * @returns {Object}
     */
    getUserActivitySummary() {
        const users = Array.from(this.users.values());
        const now = Date.now();
        
        let activeUsers = 0;
        let idleUsers = 0;
        let awayUsers = 0;
        
        users.forEach(user => {
            if (user.mode === USER_MODES.AWAY) {
                awayUsers++;
            } else if (user.isIdle()) {
                idleUsers++;
            } else {
                activeUsers++;
            }
        });
        
        return {
            total: users.length,
            active: activeUsers,
            idle: idleUsers,
            away: awayUsers
        };
    }

    /**
     * Log activity for tracking
     * @param {string} type 
     * @param {Object} details 
     */
    logActivity(type, details) {
        const activity = {
            id: Date.now() + Math.random().toString(36).substring(2),
            type,
            timestamp: new Date(),
            details
        };
        
        this.recentActivities.unshift(activity);
        
        // Keep only recent activities
        if (this.recentActivities.length > this.maxActivities) {
            this.recentActivities = this.recentActivities.slice(0, this.maxActivities);
        }
        
        // Emit activity event for real-time updates
        this.emit('activity', activity);
    }

    /**
     * Get recent activities
     * @param {number} limit 
     * @returns {Array}
     */
    getRecentActivities(limit = 50) {
        return this.recentActivities.slice(0, limit);
    }

    /**
     * Get comprehensive server statistics
     * @returns {Object}
     */
    getStats() {
        const currentTime = Date.now();
        const uptimeMs = currentTime - this.serverStartTime.getTime();
        
        return {
            // Basic stats
            totalConnections: this.stats.totalConnections,
            totalPacketsReceived: this.stats.totalPacketsReceived,
            totalPacketsSent: this.stats.totalPacketsSent,
            totalMessagesProcessed: this.stats.totalMessagesProcessed,
            peakConcurrentUsers: this.stats.peakConcurrentUsers,
            totalRoomsCreated: this.stats.totalRoomsCreated,
            totalLoginAttempts: this.stats.totalLoginAttempts,
            totalFailedLogins: this.stats.totalFailedLogins,
            
            // Current state
            onlineUsers: this.users.size,
            totalRooms: this.rooms.size,
            currentUsers: this.users.size,
            activeRooms: Array.from(this.rooms.values()).filter(room => room.users.size > 0).length,
            
            // Uptime information
            uptime: uptimeMs,
            uptimeFormatted: this.formatUptime(uptimeMs),
            serverStartTime: this.serverStartTime,
            
            // Performance metrics
            memoryUsage: this.performanceMetrics.memoryUsage,
            cpuUsage: this.performanceMetrics.cpuUsage,
            
            // Activity stats
            recentActivitiesCount: this.recentActivities.length,
            bannedUsersCount: this.bannedUsers.size,
            
            // Additional computed stats
            averageUsersPerRoom: this.rooms.size > 0 ? (this.users.size / this.rooms.size).toFixed(2) : 0,
            timestamp: currentTime
        };
    }

    /**
     * Ban a user
     * @param {number} userId 
     * @param {string} reason 
     * @param {number} duration - Duration in milliseconds, null for permanent
     */
    banUser(userId, reason = 'No reason provided', duration = null) {
        const banInfo = {
            reason,
            bannedAt: new Date(),
            duration,
            expiresAt: duration ? new Date(Date.now() + duration) : null
        };
        
        this.bannedUsers.set(userId, banInfo);
        
        // Disconnect user if online
        const user = this.getUser(userId);
        if (user && user.socket) {
            this.removeUserConnection(user.socket, `Banned: ${reason}`);
        }
        
        this.logActivity('user_banned', {
            userId,
            reason,
            duration: duration ? `${Math.round(duration / 60000)} minutes` : 'permanent'
        });
        
        logger.warn('User banned', { userId, reason, duration });
    }

    /**
     * Check if user is banned
     * @param {number} userId 
     * @returns {boolean}
     */
    isUserBanned(userId) {
        const banInfo = this.bannedUsers.get(userId);
        if (!banInfo) return false;
        
        // Check if ban has expired
        if (banInfo.expiresAt && banInfo.expiresAt < new Date()) {
            this.bannedUsers.delete(userId);
            this.logActivity('ban_expired', { userId });
            return false;
        }
        
        return true;
    }

    /**
     * Close a room
     * @param {number} roomId 
     * @param {string} reason 
     */
    closeRoom(roomId, reason = 'Administrative action') {
        const room = this.getRoom(roomId);
        if (!room) return false;
        
        // Notify all users in the room
        room.getAllUsers().forEach(user => {
            if (user.socket) {
                // Send room closure notification
                const notificationBuffer = Buffer.from(`Room "${room.name}" has been closed: ${reason}`, 'utf8');
                // You would send appropriate packet here
            }
        });
        
        // Remove all users from room
        room.getAllUsers().forEach(user => {
            room.removeUser(user);
        });
        
        // Remove room
        this.removeRoom(roomId);
        
        this.logActivity('room_closed', {
            roomId,
            roomName: room.name,
            reason,
            userCount: room.getAllUsers().length
        });
        
        return true;
    }

    /**
     * Perform server maintenance and cleanup
     */
    performMaintenance() {
        logger.info('Performing server maintenance...');
        
        // Clean up expired bans
        let expiredBans = 0;
        for (const [userId, banInfo] of this.bannedUsers) {
            if (banInfo.expiresAt && banInfo.expiresAt < new Date()) {
                this.bannedUsers.delete(userId);
                expiredBans++;
            }
        }
        
        // Clean up old activities
        const oldActivityCount = this.recentActivities.length;
        this.recentActivities = this.recentActivities.slice(0, this.maxActivities);
        
        // Clean up idle connections
        let idleDisconnects = 0;
        this.users.forEach(user => {
            if (user.isIdle(30 * 60 * 1000)) { // 30 minutes
                this.removeUserConnection(user.socket, 'Idle timeout');
                idleDisconnects++;
            }
        });
        
        this.logActivity('maintenance_completed', {
            expiredBans,
            activitiesCleaned: oldActivityCount - this.recentActivities.length,
            idleDisconnects
        });
        
        logger.info('Server maintenance completed', {
            expiredBans,
            idleDisconnects
        });
    }
}

// Create singleton instance
const serverState = new ServerState();

module.exports = serverState;
