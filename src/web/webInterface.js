/**
 * Web interface for monitoring the Paltalk server
 */
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const logger = require('../utils/logger');
const { SERVER_CONFIG } = require('../config/constants');
const { sendPacket } = require('../network/packetSender');
const { PACKET_TYPES } = require('../../packetHeaders');

class WebInterface {
    constructor(serverState, voiceServer, databaseManager) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server);
        this.serverState = serverState;
        this.voiceServer = voiceServer;
        this.db = databaseManager;
        this.isRunning = false;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupEventListeners();
    }

    setupMiddleware() {
        // Serve static files
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use(express.json());
        
        // CORS for development
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
    }

    setupRoutes() {
        // Main dashboard
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
        });

        // API Routes
        
        // Server statistics
        this.app.get('/api/stats', async (req, res) => {
            try {
                const serverStats = this.serverState.getStats();
                const voiceStats = this.voiceServer.getStats();
                const dbStats = await this.db.getStats();
                
                res.json({
                    server: serverStats,
                    voice: voiceStats,
                    database: dbStats,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('Failed to get server stats', error);
                res.status(500).json({ error: 'Failed to get server stats' });
            }
        });

        // Enhanced server statistics
        this.app.get('/api/stats/detailed', (req, res) => {
            try {
                const stats = this.serverState.getStats();
                const roomStats = this.serverState.getRoomStatistics();
                const userActivity = this.serverState.getUserActivitySummary();
                
                res.json({
                    server: stats,
                    rooms: roomStats,
                    users: userActivity,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('Failed to get detailed stats', error);
                res.status(500).json({ error: 'Failed to get detailed stats' });
            }
        });

        // Real-time activity feed
        this.app.get('/api/activity', (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 50;
                const activities = this.serverState.getRecentActivities(limit);
                res.json(activities);
            } catch (error) {
                logger.error('Failed to get activity feed', error);
                res.status(500).json({ error: 'Failed to get activity feed' });
            }
        });

        // Online users
        this.app.get('/api/users', (req, res) => {
            try {
                const users = this.serverState.getOnlineUsers().map(user => user.getSummary());
                res.json(users);
            } catch (error) {
                logger.error('Failed to get users', error);
                res.status(500).json({ error: 'Failed to get users' });
            }
        });

        // Active rooms
        this.app.get('/api/rooms', (req, res) => {
            try {
                const rooms = this.serverState.getAllRooms().map(room => room.getSummary());
                res.json(rooms);
            } catch (error) {
                logger.error('Failed to get rooms', error);
                res.status(500).json({ error: 'Failed to get rooms' });
            }
        });

        // Rooms by category - supports dynamic Top Rooms
        this.app.get('/api/rooms/category/:categoryId', (req, res) => {
            try {
                const categoryId = parseInt(req.params.categoryId);
                const rooms = this.serverState.getRoomsByCategory(categoryId);
                const roomList = rooms.map(room => room.getSummary());
                
                logger.debug('Category rooms requested', {
                    categoryId,
                    roomCount: rooms.length,
                    isTopRooms: categoryId === 30001
                });
                
                res.json({
                    categoryId,
                    rooms: roomList,
                    count: roomList.length,
                    isTopRooms: categoryId === 30001, // Flag for Top Rooms dynamic category
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('Failed to get rooms by category', error, { categoryId: req.params.categoryId });
                res.status(500).json({ error: 'Failed to get rooms by category' });
            }
        });

        // Server logs (recent)
        this.app.get('/api/logs', (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 50;
                const logs = logger.getRecentLogs(limit);
                res.json({ logs });
            } catch (error) {
                logger.error('Failed to get logs', error);
                res.status(500).json({ error: 'Failed to get logs' });
            }
        });

        // Room ID validation and ranges
        this.app.get('/api/rooms/validate/:roomId', (req, res) => {
            try {
                const roomId = parseInt(req.params.roomId);
                const allRooms = this.serverState.getAllRooms();
                const room = this.serverState.getRoom(roomId);
                
                const roomIdRanges = {
                    lowest: Math.min(...allRooms.map(r => r.id)),
                    highest: Math.max(...allRooms.map(r => r.id)),
                    totalRooms: allRooms.length
                };
                
                const categoryRanges = {
                    topRooms: { start: 10001, end: 10015, count: allRooms.filter(r => r.id >= 10001 && r.id <= 10015).length },
                    featuredRooms: { start: 20001, end: 20015, count: allRooms.filter(r => r.id >= 20001 && r.id <= 20015).length },
                    helpRooms: { start: 30001, end: 30012, count: allRooms.filter(r => r.id >= 30001 && r.id <= 30012).length },
                    friendsRooms: { start: 40001, end: 40018, count: allRooms.filter(r => r.id >= 40001 && r.id <= 40018).length },
                    loveRooms: { start: 50001, end: 50016, count: allRooms.filter(r => r.id >= 50001 && r.id <= 50016).length },
                    socialRooms: { start: 60001, end: 60014, count: allRooms.filter(r => r.id >= 60001 && r.id <= 60014).length },
                    youngAdultRooms: { start: 70001, end: 70017, count: allRooms.filter(r => r.id >= 70001 && r.id <= 70017).length },
                    religiousRooms: { start: 80001, end: 80013, count: allRooms.filter(r => r.id >= 80001 && r.id <= 80013).length },
                    computerRooms: { start: 90001, end: 90015, count: allRooms.filter(r => r.id >= 90001 && r.id <= 90015).length },
                    sportsRooms: { start: 100001, end: 100020, count: allRooms.filter(r => r.id >= 100001 && r.id <= 100020).length },
                    businessRooms: { start: 110001, end: 110016, count: allRooms.filter(r => r.id >= 110001 && r.id <= 110016).length },
                    musicRooms: { start: 120001, end: 120018, count: allRooms.filter(r => r.id >= 120001 && r.id <= 120018).length },
                    miscRooms: { start: 130001, end: 130019, count: allRooms.filter(r => r.id >= 130001 && r.id <= 130019).length },
                    adultRooms: { start: 140001, end: 140015, count: allRooms.filter(r => r.id >= 140001 && r.id <= 140015).length }
                };
                
                res.json({
                    roomId,
                    exists: !!room,
                    room: room ? room.getSummary() : null,
                    validation: {
                        isValid: !!room,
                        isInValidRange: roomId >= roomIdRanges.lowest && roomId <= roomIdRanges.highest,
                        validRoomRange: `${roomIdRanges.lowest} - ${roomIdRanges.highest}`,
                        totalRooms: roomIdRanges.totalRooms
                    },
                    categoryRanges,
                    suggestions: room ? [] : allRooms
                        .filter(r => Math.abs(r.id - roomId) <= 50)
                        .map(r => ({ id: r.id, name: r.name, category: r.category }))
                        .slice(0, 5)
                });
            } catch (error) {
                logger.error('Failed to validate room ID', error);
                res.status(500).json({ error: 'Failed to validate room ID' });
            }
        });

        // User search
        this.app.get('/api/users/search', async (req, res) => {
            try {
                const { nickname } = req.query;
                if (!nickname) {
                    return res.status(400).json({ error: 'Nickname parameter required' });
                }
                
                const users = await this.db.searchUsersByNickname(nickname, false);
                res.json(users);
            } catch (error) {
                logger.error('Failed to search users', error);
                res.status(500).json({ error: 'Failed to search users' });
            }
        });

        // Admin actions
        this.app.post('/api/admin/kick-user', (req, res) => {
            try {
                const { userId, reason } = req.body;
                
                if (!userId || isNaN(parseInt(userId))) {
                    return res.status(400).json({ error: 'Valid User ID required' });
                }
                
                const user = this.serverState.getUser(parseInt(userId));
                if (!user) {
                    return res.status(404).json({ error: 'User not found or not online' });
                }
                
                // Send kick notification to user before disconnecting
                if (user.socket) {
                    try {
                        const kickMessage = `You have been kicked by an administrator. Reason: ${reason || 'No reason provided'}`;
                        const kickBuffer = Buffer.from(kickMessage, 'utf8');
                        sendPacket(user.socket, PACKET_TYPES.ANNOUNCEMENT, kickBuffer, user.socket.id);
                        
                        // Give a moment for the message to be sent before disconnecting
                        setTimeout(() => {
                            try {
                                if (user.socket && user.socket.destroy) {
                                    user.socket.destroy();
                                }
                            } catch (destroyError) {
                                logger.warn('Error destroying socket during kick', { 
                                    userId: parseInt(userId), 
                                    error: destroyError.message 
                                });
                            }
                        }, 100);
                    } catch (packetError) {
                        logger.warn('Failed to send kick notification', { 
                            userId: parseInt(userId), 
                            error: packetError.message 
                        });
                    }
                }
                
                // Remove user connection using UID (more reliable than socket)
                const removed = this.serverState.removeUserConnection(parseInt(userId), `Kicked by admin: ${reason || 'No reason provided'}`);
                
                if (removed) {
                    logger.info('User kicked by admin', { userId: parseInt(userId), reason, nickname: user.nickname });
                    res.json({ success: true, message: 'User kicked successfully' });
                } else {
                    logger.warn('Failed to remove user connection during kick', { userId: parseInt(userId) });
                    res.status(500).json({ error: 'Failed to disconnect user' });
                }
            } catch (error) {
                logger.error('Failed to kick user', error, { userId: req.body.userId });
                res.status(500).json({ error: 'Failed to kick user: ' + error.message });
            }
        });

        // Alternative kick endpoint to match dashboard expectations
        this.app.post('/api/admin/kick/:userId', (req, res) => {
            try {
                const userId = parseInt(req.params.userId);
                const { reason } = req.body;
                
                if (!userId || isNaN(userId)) {
                    return res.status(400).json({ error: 'Valid User ID required' });
                }
                
                const user = this.serverState.getUser(userId);
                if (!user) {
                    return res.status(404).json({ error: 'User not found or not online' });
                }
                
                // Send kick notification to user before disconnecting
                if (user.socket) {
                    try {
                        const kickMessage = `You have been kicked by an administrator. Reason: ${reason || 'No reason provided'}`;
                        const kickBuffer = Buffer.from(kickMessage, 'utf8');
                        sendPacket(user.socket, PACKET_TYPES.ANNOUNCEMENT, kickBuffer, user.socket.id);
                        
                        // Give a moment for the message to be sent before disconnecting
                        setTimeout(() => {
                            try {
                                if (user.socket && user.socket.destroy) {
                                    user.socket.destroy();
                                }
                            } catch (destroyError) {
                                logger.warn('Error destroying socket during kick', { 
                                    userId, 
                                    error: destroyError.message 
                                });
                            }
                        }, 100);
                    } catch (packetError) {
                        logger.warn('Failed to send kick notification', { 
                            userId, 
                            error: packetError.message 
                        });
                    }
                }
                
                // Remove user connection using UID (more reliable than socket)
                const removed = this.serverState.removeUserConnection(userId, `Kicked by admin: ${reason || 'No reason provided'}`);
                
                if (removed) {
                    logger.info('User kicked by admin', { userId, reason, nickname: user.nickname });
                    res.json({ success: true, message: 'User kicked successfully' });
                } else {
                    logger.warn('Failed to remove user connection during kick', { userId });
                    res.status(500).json({ error: 'Failed to disconnect user' });
                }
            } catch (error) {
                logger.error('Failed to kick user', error, { userId: req.params.userId });
                res.status(500).json({ error: 'Failed to kick user: ' + error.message });
            }
        });

        this.app.post('/api/admin/broadcast', (req, res) => {
            try {
                const { message } = req.body;
                
                if (!message || message.trim().length === 0) {
                    return res.status(400).json({ error: 'Message required' });
                }
                
                // Broadcast to all users using proper packet protocol
                let sentCount = 0;
                this.serverState.getOnlineUsers().forEach(user => {
                    if (user.socket) {
                        try {
                            const announcementBuffer = Buffer.from(`ADMIN BROADCAST: ${message}`, 'utf8');
                            sendPacket(user.socket, PACKET_TYPES.ANNOUNCEMENT, announcementBuffer, user.socket.id);
                            sentCount++;
                        } catch (error) {
                            logger.warn('Failed to send broadcast to user', { userId: user.uid, error: error.message });
                        }
                    }
                });
                
                logger.info('Admin broadcast sent', { message, sentToUsers: sentCount });
                res.json({ success: true, message: `Broadcast sent successfully to ${sentCount} users` });
            } catch (error) {
                logger.error('Failed to send broadcast', error);
                res.status(500).json({ error: 'Failed to send broadcast' });
            }
        });

        // Performance monitoring endpoint
        this.app.get('/api/performance', (req, res) => {
            try {
                const memUsage = process.memoryUsage();
                const cpuUsage = process.cpuUsage();
                
                res.json({
                    memory: {
                        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                        external: Math.round(memUsage.external / 1024 / 1024)
                    },
                    cpu: cpuUsage,
                    uptime: Math.round(process.uptime()),
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('Failed to get performance data', error);
                res.status(500).json({ error: 'Failed to get performance data' });
            }
        });

        // Enhanced user management
        this.app.post('/api/admin/user/:userId/ban', (req, res) => {
            try {
                const { userId } = req.params;
                const { reason, duration } = req.body;
                
                const user = this.serverState.getUser(parseInt(userId));
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                
                // Ban user
                this.serverState.banUser(userId, reason, duration);
                
                logger.info('User banned by admin', { userId, reason, duration });
                res.json({ success: true, message: 'User banned successfully' });
            } catch (error) {
                logger.error('Failed to ban user', error);
                res.status(500).json({ error: 'Failed to ban user' });
            }
        });

        // Room management
        this.app.post('/api/admin/room/:roomId/close', (req, res) => {
            try {
                const { roomId } = req.params;
                const { reason } = req.body;
                
                const room = this.serverState.getRoom(parseInt(roomId));
                if (!room) {
                    return res.status(404).json({ error: 'Room not found' });
                }
                
                // Close room
                this.serverState.closeRoom(roomId, reason);
                
                logger.info('Room closed by admin', { roomId, reason });
                res.json({ success: true, message: 'Room closed successfully' });
            } catch (error) {
                logger.error('Failed to close room', error);
                res.status(500).json({ error: 'Failed to close room' });
            }
        });

        // Server maintenance
        this.app.post('/api/admin/maintenance', (req, res) => {
            try {
                const { action, message } = req.body;
                
                switch (action) {
                    case 'cleanup':
                        this.serverState.performMaintenance();
                        break;
                    case 'restart_voice':
                        this.voiceServer.restart();
                        break;
                    case 'clear_logs':
                        // Clear old logs
                        break;
                    default:
                        return res.status(400).json({ error: 'Invalid maintenance action' });
                }
                
                logger.info('Maintenance action performed', { action, message });
                res.json({ success: true, message: 'Maintenance completed' });
            } catch (error) {
                logger.error('Failed to perform maintenance', error);
                res.status(500).json({ error: 'Failed to perform maintenance' });
            }
        });

        // User management endpoints
        this.app.get('/api/users/:userId', async (req, res) => {
            try {
                const userId = parseInt(req.params.userId);
                const user = await this.db.getUserByUid(userId);
                
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                
                // Remove sensitive data
                const { password, ...safeUser } = user;
                res.json(safeUser);
            } catch (error) {
                logger.error('Failed to get user details', error);
                res.status(500).json({ error: 'Failed to get user details' });
            }
        });

        this.app.put('/api/admin/users/:userId', async (req, res) => {
            try {
                const userId = parseInt(req.params.userId);
                const updateData = req.body;
                
                // Validate required fields
                if (!updateData.nickname || !updateData.email) {
                    return res.status(400).json({ error: 'Nickname and email are required' });
                }
                
                // Update user in database
                await this.db.updateUser(userId, updateData);
                
                // If user is online, update their data in memory
                const onlineUser = this.serverState.getUser(userId);
                if (onlineUser) {
                    onlineUser.nickname = updateData.nickname;
                    onlineUser.email = updateData.email;
                    onlineUser.firstName = updateData.firstName || '';
                    onlineUser.lastName = updateData.lastName || '';
                    onlineUser.paid1 = updateData.paid1;
                    onlineUser.admin = updateData.admin;
                }
                
                logger.info('User updated by admin', { userId, updateData });
                res.json({ success: true, message: 'User updated successfully' });
            } catch (error) {
                logger.error('Failed to update user', error);
                res.status(500).json({ error: 'Failed to update user' });
            }
        });

        this.app.delete('/api/admin/users/:userId', async (req, res) => {
            try {
                const userId = parseInt(req.params.userId);
                
                // First disconnect user if online
                const onlineUser = this.serverState.getUser(userId);
                if (onlineUser) {
                    this.serverState.removeUserConnection(userId, 'Account deleted by administrator');
                }
                
                // Delete user from database
                await this.db.deleteUser(userId);
                
                logger.info('User deleted by admin', { userId });
                res.json({ success: true, message: 'User deleted successfully' });
            } catch (error) {
                logger.error('Failed to delete user', error);
                res.status(500).json({ error: 'Failed to delete user' });
            }
        });
    }

    setupWebSocket() {
        this.io.on('connection', (socket) => {
            logger.info('Web client connected', { socketId: socket.id });
            
            // Send initial data
            this.sendServerState(socket);
            
            socket.on('disconnect', () => {
                logger.debug('Web client disconnected', { socketId: socket.id });
            });
            
            socket.on('requestUpdate', () => {
                this.sendServerState(socket);
            });
        });
    }

    setupEventListeners() {
        // Listen for server state changes and broadcast to web clients
        this.serverState.on('userConnected', () => {
            this.broadcastUpdate('userConnected');
        });

        this.serverState.on('userDisconnected', () => {
            this.broadcastUpdate('userDisconnected');
        });

        this.serverState.on('roomCreated', () => {
            this.broadcastUpdate('roomCreated');
        });

        this.serverState.on('roomDeleted', () => {
            this.broadcastUpdate('roomDeleted');
        });

        // New events for real-time room updates
        this.serverState.on('userJoinedRoom', () => {
            this.broadcastUpdate('userJoinedRoom');
        });

        this.serverState.on('userLeftRoom', () => {
            this.broadcastUpdate('userLeftRoom');
        });
    }

    async sendServerState(socket) {
        try {
            // Check if serverState and its methods are available
            if (!this.serverState || typeof this.serverState.getStats !== 'function') {
                logger.error('ServerState not properly initialized or getStats method missing');
                return;
            }
            
            const stats = this.serverState.getStats();
            const voiceStats = this.voiceServer.getStats();
            
            // Get detailed user and room data for the dashboard
            const users = this.serverState.getOnlineUsers().map(user => {
                // Get all room names user is currently in
                let currentRoomNames = [];
                if (user.getRoomCount() > 0) {
                    const roomIds = user.getRoomIds();
                    currentRoomNames = roomIds.map(roomId => {
                        const room = this.serverState.getRoom(roomId);
                        return room ? room.name : `Room ${roomId}`;
                    }).filter(Boolean);
                }
                
                return {
                    uid: user.uid,
                    nickname: user.nickname,
                    mode: user.mode,
                    isAdmin: user.isAdmin(),
                    currentRoom: currentRoomNames.length > 0 ? currentRoomNames.join(', ') : null,
                    currentRooms: currentRoomNames, // Array of all room names
                    roomCount: user.getRoomCount(),
                    loginTime: user.loginTime,
                    lastActivity: user.lastActivity,
                    paid1: user.paid1, // Include paid status for badge display
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName
                };
            });
            
            const rooms = this.serverState.getAllRooms().map(room => ({
                id: room.id,
                name: room.name,
                userCount: room.getUserCount(),
                maxUsers: room.maxUsers,
                isVoice: room.isVoice,
                isPrivate: room.isPrivate,
                isPermanent: room.isPermanent,
                category: room.category,
                rating: room.rating,
                createdAt: room.createdAt
            }));
            
            socket.emit('serverState', {
                stats,
                voice: voiceStats,
                users,
                rooms,
                logs: logger.getRecentLogs(25), // Include recent logs
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to send server state', error);
        }
    }

    broadcastUpdate(eventType) {
        this.io.emit('serverUpdate', {
            eventType,
            timestamp: new Date().toISOString()
        });
        
        // Send full state update to all connected clients
        this.io.sockets.sockets.forEach((socket) => {
            this.sendServerState(socket);
        });
    }

    start() {
        return new Promise((resolve, reject) => {
            this.server.listen(SERVER_CONFIG.WEB_UI_PORT, (error) => {
                if (error) {
                    logger.error('Failed to start web interface', error);
                    reject(error);
                } else {
                    this.isRunning = true;
                    logger.info('Web interface started', {
                        port: SERVER_CONFIG.WEB_UI_PORT,
                        url: `http://localhost:${SERVER_CONFIG.WEB_UI_PORT}`
                    });
                    resolve();
                }
            });
        });
    }

    async stop() {
        return new Promise((resolve) => {
            if (!this.server || !this.isRunning) {
                resolve();
                return;
            }

            this.server.close(() => {
                this.isRunning = false;
                logger.info('Web interface stopped');
                resolve();
            });
        });
    }

    getStats() {
        return {
            isRunning: this.isRunning,
            connectedClients: this.io.engine.clientsCount || 0,
            port: SERVER_CONFIG.WEB_UI_PORT
        };
    }
}

module.exports = WebInterface;
