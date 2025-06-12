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
            totalMessagesProcessed: 0
        };
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
    removeUserConnection(socketOrUid) {
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
                return false;
            }

            // Remove from current room
            if (user.currentRoom) {
                const room = this.rooms.get(user.currentRoom);
                if (room) {
                    room.removeUser(user);
                    
                    // Auto-delete temporary rooms
                    if (room.shouldAutoDelete()) {
                        this.removeRoom(room.id);
                    }
                }
            }

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
                sessionId: user.sessionId
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
     * Get server statistics
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.serverStartTime.getTime(),
            onlineUsers: this.getOnlineUsers().length,
            totalUsers: this.users.size,
            totalRooms: this.rooms.size,
            totalCategories: this.categories.size,
            serverStartTime: this.serverStartTime
        };
    }

    /**
     * Get complete server state for web UI
     * @returns {Object}
     */
    getServerState() {
        return {
            stats: this.getStats(),
            users: this.getOnlineUsers().map(user => user.getSummary()),
            rooms: this.getAllRooms().map(room => room.getSummary()),
            categories: this.getAllCategories()
        };
    }

    /**
     * Broadcast status change to buddies
     * @param {User} user 
     * @param {number} newMode 
     */
    broadcastStatusChange(user, newMode) {
        this.getOnlineUsers().forEach(onlineUser => {
            if (onlineUser.hasBuddy(user.uid)) {
                this.emit('statusChangeForBuddy', onlineUser, user, newMode);
            }
        });
    }

    /**
     * Clean up inactive connections and temporary rooms
     */
    cleanup() {
        let cleanedConnections = 0;
        let cleanedRooms = 0;

        // Clean up inactive sockets
        for (const [socketId, connection] of this.sockets) {
            if (!connection.socket || !connection.socket.readable) {
                this.removeUserConnection(connection.socket);
                cleanedConnections++;
            }
        }

        // Clean up empty temporary rooms
        for (const room of this.rooms.values()) {
            if (room.shouldAutoDelete()) {
                this.removeRoom(room.id);
                cleanedRooms++;
            }
        }

        if (cleanedConnections > 0 || cleanedRooms > 0) {
            logger.info('Cleanup completed', {
                cleanedConnections,
                cleanedRooms
            });
        }
    }
}

// Create singleton instance
const serverState = new ServerState();

module.exports = serverState;
