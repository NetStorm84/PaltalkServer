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

        // Voice dashboard
        this.app.get('/voice-dashboard.html', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'voice-dashboard.html'));
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
                const users = this.serverState.getAllUsers().map(user => ({
                    uid: user.uid,
                    nickname: user.nickname,
                    mode: user.mode,
                    isAdmin: user.isAdmin(),
                    loginTime: user.loginTime
                }));
                res.json(users);
            } catch (error) {
                logger.error('Failed to get users', error);
                res.status(500).json({ error: 'Failed to get users' });
            }
        });

        // Voice server detailed statistics 
        this.app.get('/api/voice/stats', (req, res) => {
            try {
                // Use the enhanced statistics method instead of basic stats
                const voiceStats = this.voiceServer.getServerStatistics();
                res.json(voiceStats);
            } catch (error) {
                logger.error('Failed to get voice server stats', error);
                res.status(500).json({ error: 'Failed to get voice server stats' });
            }
        });

        // Voice server logs
        this.app.get('/api/voice/logs', (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 50;
                // Fetch the most recent voice-related logs from the logger
                const logs = logger.getRecentLogs(limit, 'voice');
                res.json(logs);
            } catch (error) {
                logger.error('Failed to get voice logs', error);
                res.status(500).json({ error: 'Failed to get voice logs' });
            }
        });

        // Voice server debug information
        this.app.get('/api/voice/debug', (req, res) => {
            try {
                const voiceStats = this.voiceServer.getServerStatistics();
                
                // Extend with additional debug information
                const debugData = {
                    packetsProcessed: voiceStats.totalPacketsRelayed || 0,
                    avgPacketSize: 0,
                    dataRate: 0,
                    totalConnections: 0,
                    connectionErrors: 0,
                    avgDuration: 0,
                    rawState: voiceStats
                };
                
                // Calculate additional metrics if data is available
                if (voiceStats.connections && voiceStats.connections.length > 0) {
                    // Calculate average packet size across connections
                    let totalBytes = 0;
                    voiceStats.connections.forEach(conn => {
                        totalBytes += (conn.bytesReceived || 0);
                    });
                    debugData.avgPacketSize = Math.round(totalBytes / Math.max(voiceStats.totalPacketsRelayed, 1));
                    
                    // Calculate approximate data rate (bytes per second)
                    const uptime = Date.now() - voiceStats.serverStartTime;
                    const uptimeSeconds = uptime / 1000;
                    debugData.dataRate = Math.round(totalBytes / Math.max(uptimeSeconds, 1) / 1024); // KB/s
                    
                    // Calculate average connection duration
                    let totalDuration = 0;
                    const now = Date.now();
                    voiceStats.connections.forEach(conn => {
                        if (conn.connectTime) {
                            totalDuration += (now - new Date(conn.connectTime).getTime()) / 1000;
                        }
                    });
                    debugData.avgDuration = Math.round(totalDuration / voiceStats.connections.length);
                    
                    // Set total connections count
                    debugData.totalConnections = voiceStats.connections.length;
                }
                
                res.json(debugData);
            } catch (error) {
                logger.error('Failed to get voice debug info', error);
                res.status(500).json({ error: 'Failed to get voice debug info' });
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

        // Bot management endpoints
        this.app.get('/api/bots/stats', (req, res) => {
            try {
                const botManager = require('../core/botManager');
                const stats = botManager.getBotStats();
                
                // Add the roomDistribution property for frontend compatibility
                stats.roomDistribution = stats.botsPerRoom;
                
                res.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                logger.error('Failed to get bot stats', error);
                res.status(500).json({ success: false, error: 'Failed to get bot stats' });
            }
        });

        this.app.post('/api/bots/start', (req, res) => {
            try {
                const botManager = require('../core/botManager');
                const { BOT_CONFIG } = require('../config/constants');
                const { 
                    botCount = BOT_CONFIG.DEFAULT_BOT_COUNT, 
                    chatFrequency = BOT_CONFIG.DEFAULT_CHAT_FREQUENCY_MS, 
                    moveFrequency = BOT_CONFIG.DEFAULT_MOVE_FREQUENCY_MS, 
                    targetRoomId = null,
                    distributionMode = null,
                    roomIds = null
                } = req.body;
                
                logger.info('Bot start request received', { 
                    botCount, 
                    chatFrequency, 
                    moveFrequency, 
                    targetRoomId, 
                    distributionMode,
                    roomIds 
                });
                
                // Handle special values and parse room selection
                let processedConfig = {
                    botCount: parseInt(botCount),
                    chatFrequencyMs: parseInt(chatFrequency),
                    moveFrequencyMs: parseInt(moveFrequency),
                    targetRoomId: null,
                    distributionMode: distributionMode,
                    roomIds: null
                };

                // Process room selection
                if (targetRoomId === "first") {
                    // Use the first available room
                    const availableRooms = this.serverState?.getAllRooms?.()?.filter(room => !room.isPrivate) || [];
                    if (availableRooms.length > 0) {
                        processedConfig.targetRoomId = availableRooms[0].id;
                        processedConfig.distributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM;
                        logger.info('Using first available room for bots', { 
                            roomId: processedConfig.targetRoomId, 
                            roomName: availableRooms[0].name,
                            totalAvailableRooms: availableRooms.length
                        });
                    } else {
                        logger.warn('No available rooms found for "first" target');
                    }
                } else if (targetRoomId && targetRoomId !== null && targetRoomId !== "null") {
                    processedConfig.targetRoomId = parseInt(targetRoomId);
                    processedConfig.distributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM;
                    logger.info('Using specific room ID', { targetRoomId: processedConfig.targetRoomId });
                } else if (roomIds && Array.isArray(roomIds) && roomIds.length > 0) {
                    // Multiple rooms specified
                    processedConfig.roomIds = roomIds.map(id => parseInt(id)).filter(id => !isNaN(id));
                    processedConfig.distributionMode = processedConfig.roomIds.length === 1 
                        ? BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM 
                        : BOT_CONFIG.ROOM_DISTRIBUTION_MODES.WEIGHTED;
                    logger.info('Using specific rooms', { roomIds: processedConfig.roomIds });
                } else if (!distributionMode || distributionMode === 'random') {
                    processedConfig.distributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.RANDOM;
                } else if (distributionMode === 'balanced') {
                    processedConfig.distributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.BALANCED;
                }
                
                logger.info('Final bot configuration', processedConfig);
                
                botManager.startBots(processedConfig).then(result => {
                    if (result.success) {
                        logger.info('Bots started via web interface', { 
                            botCount: result.botCount,
                            chatFrequency,
                            moveFrequency 
                        });
                        
                        const response = {
                            success: true,
                            data: {
                                activeBots: result.botCount,
                                message: result.message
                            }
                        };
                        res.json(response);
                        
                        // Broadcast update to all connected dashboards
                        this.io.emit('botStatus', { isRunning: true, activeBots: result.botCount });
                    } else {
                        res.status(400).json(result);
                    }
                }).catch(error => {
                    logger.error('Error starting bots', error);
                    res.status(500).json({ error: 'Failed to start bots', details: error.message });
                });
            } catch (error) {
                logger.error('Failed to start bots', error);
                res.status(500).json({ error: 'Failed to start bots' });
            }
        });

        this.app.post('/api/bots/stop', (req, res) => {
            try {
                const botManager = require('../core/botManager');
                
                botManager.stopBots().then(result => {
                    if (result.success) {
                        logger.info('Bots stopped via web interface');
                        
                        const response = {
                            success: true,
                            data: {
                                message: result.message
                            }
                        };
                        res.json(response);
                        
                        // Broadcast update to all connected dashboards
                        this.io.emit('botStatus', { isRunning: false, activeBots: 0 });
                    } else {
                        res.status(400).json(result);
                    }
                }).catch(error => {
                    logger.error('Error stopping bots', error);
                    res.status(500).json({ error: 'Failed to stop bots', details: error.message });
                });
            } catch (error) {
                logger.error('Failed to stop bots', error);
                res.status(500).json({ error: 'Failed to stop bots' });
            }
        });

        // Available rooms endpoint for bot configuration
        this.app.get('/api/rooms/available', (req, res) => {
            try {
                const availableRooms = this.serverState?.getAllRooms?.()?.filter(room => !room.isPrivate) || [];
                const roomData = availableRooms.map(room => ({
                    id: room.id,
                    name: room.name,
                    userCount: room.getUserCount(),
                    isVoice: room.isVoice,
                    topic: room.topic || '',
                    category: room.category || 'General'
                }));

                res.json({
                    success: true,
                    data: {
                        rooms: roomData,
                        total: roomData.length
                    }
                });
            } catch (error) {
                logger.error('Failed to get available rooms', error);
                res.status(500).json({ error: 'Failed to get available rooms' });
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

        // Voice server specific events
        // Start periodic voice metrics broadcasting
        setInterval(() => {
            this.broadcastVoiceMetrics();
        }, 3000); // Update every 3 seconds
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

    /**
     * Broadcast voice server metrics to connected clients
     */
    broadcastVoiceMetrics() {
        try {
            // Get comprehensive voice server statistics
            const voiceStats = this.voiceServer.getServerStatistics();
            
            // Get voice-specific logs
            const voiceLogs = logger.getRecentLogs(10, 'voice');
            
            // Broadcast to all connected clients
            this.io.emit('voiceMetrics', {
                stats: voiceStats,
                logs: voiceLogs,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to broadcast voice metrics', error);
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
