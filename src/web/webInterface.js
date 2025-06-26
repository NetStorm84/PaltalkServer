/**
 * Web interface for monitoring the Paltalk server
 */
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const logger = require('../utils/logger');
const { SERVER_CONFIG, SECURITY_SETTINGS } = require('../config/constants');
const { sendPacket } = require('../network/packetSender');
const { PACKET_TYPES } = require('../../PacketHeaders');
const AuthController = require('./controllers/authController');
const { requireAuth, requireAdmin, requireApiAuth } = require('./middleware/authMiddleware');

class WebInterface {
    constructor(serverState, voiceServer, databaseManager) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server);
        this.serverState = serverState;
        this.voiceServer = voiceServer;
        this.db = databaseManager;
        this.isRunning = false;
        
        // Initialize auth controller
        this.authController = new AuthController(databaseManager);
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupEventListeners();
    }

    setupMiddleware() {
        // Serve static files
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use(express.json());
        
        // Add cookie parser and session middleware
        this.app.use(cookieParser());
        this.app.use(session({
            secret: SECURITY_SETTINGS.JWT_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: SECURITY_SETTINGS.SESSION_TIMEOUT
            }
        }));
        
        // CORS for development
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            next();
        });
    }

    setupRoutes() {
        // Authentication routes
        this.app.get('/login', (req, res) => {
            // If already authenticated, redirect to dashboard
            if (req.session && req.session.isAuthenticated) {
                return res.redirect('/');
            }
            res.sendFile(path.join(__dirname, 'public', 'login.html'));
        });
        
        this.app.post('/auth/login', (req, res) => {
            return this.authController.handleLogin(req, res);
        });
        
        this.app.post('/auth/logout', (req, res) => {
            return this.authController.handleLogout(req, res);
        });
        
        // Main dashboard - protected by authentication
        this.app.get('/', requireAuth, (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
        });

        // Voice dashboard - protected by authentication
        this.app.get('/voice-dashboard.html', requireAuth, (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'voice-dashboard.html'));
        });
        
        // Bot management - protected by authentication
        this.app.get('/bot-management.html', requireAuth, (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'bot-management.html'));
        });

        // Packet logs - protected by authentication
        this.app.get('/packet-logs.html', requireAuth, (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'packet-logs.html'));
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

        // General server logs
        this.app.get('/api/logs', (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 50;
                const module = req.query.module || null;
                const logs = logger.getRecentLogs(limit, module);
                res.json({ 
                    logs,
                    total: logs.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('Failed to get logs', error);
                res.status(500).json({ error: 'Failed to get logs' });
            }
        });

        // Packet logging configuration
        this.app.get('/api/logs/packet-config', (req, res) => {
            try {
                const config = logger.getConfig();
                const packetConfig = config.PACKET_LOGGING || {};
                
                res.json({
                    enabled: packetConfig.ENABLED || false,
                    detailedAnalysis: packetConfig.DETAILED_ANALYSIS || false,
                    directionFilter: packetConfig.DIRECTION_FILTER || 'both',
                    payloadDisplayLimit: packetConfig.PAYLOAD_DISPLAY_LIMIT || 256,
                    filterPacketTypes: packetConfig.FILTER_PACKET_TYPES || [],
                    includePacketTypes: packetConfig.INCLUDE_PACKET_TYPES || []
                });
            } catch (error) {
                logger.error('Failed to get packet logging config', error);
                res.status(500).json({ error: 'Failed to get packet logging config' });
            }
        });

        this.app.post('/api/logs/packet-config', requireAdmin, (req, res) => {
            try {
                const { enabled, detailedAnalysis, filterPacketTypes, includePacketTypes, directionFilter, payloadDisplayLimit } = req.body;
                
                // Update the configuration (this would ideally persist to a config file)
                const config = logger.getConfig();
                if (typeof enabled === 'boolean') {
                    config.PACKET_LOGGING.ENABLED = enabled;
                }
                if (typeof detailedAnalysis === 'boolean') {
                    config.PACKET_LOGGING.DETAILED_ANALYSIS = detailedAnalysis;
                }
                if (Array.isArray(filterPacketTypes)) {
                    config.PACKET_LOGGING.FILTER_PACKET_TYPES = filterPacketTypes;
                }
                if (Array.isArray(includePacketTypes)) {
                    config.PACKET_LOGGING.INCLUDE_PACKET_TYPES = includePacketTypes;
                }
                if (directionFilter) {
                    config.PACKET_LOGGING.DIRECTION_FILTER = directionFilter;
                }
                if (typeof payloadDisplayLimit === 'number') {
                    config.PACKET_LOGGING.PAYLOAD_DISPLAY_LIMIT = payloadDisplayLimit;
                }

                logger.info('Packet logging configuration updated', config.PACKET_LOGGING);
                res.json({ 
                    success: true, 
                    message: 'Packet logging configuration updated',
                    config: config.PACKET_LOGGING
                });
            } catch (error) {
                logger.error('Failed to update packet logging config', error);
                res.status(500).json({ error: 'Failed to update packet logging config' });
            }
        });

        // Clear packet logs
        this.app.post('/api/logs/clear-packets', requireAdmin, (req, res) => {
            try {
                logger.clearPacketLogs();
                logger.info('Packet logs cleared by admin');
                res.json({ 
                    success: true, 
                    message: 'Packet logs cleared successfully',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('Failed to clear packet logs', error);
                res.status(500).json({ error: 'Failed to clear packet logs' });
            }
        });

        // Export packet logs
        this.app.get('/api/logs/export-packets', requireAdmin, (req, res) => {
            try {
                const packetLogs = logger.getPacketLogs();
                
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=packet-logs-${new Date().toISOString().split('T')[0]}.json`);
                
                res.json({
                    exportDate: new Date().toISOString(),
                    totalLogs: packetLogs.length,
                    logs: packetLogs
                });
                
                logger.info('Packet logs exported by admin');
            } catch (error) {
                logger.error('Failed to export packet logs', error);
                res.status(500).json({ error: 'Failed to export packet logs' });
            }
        });

        // Get packet logs for viewing
        this.app.get('/api/logs/packets', (req, res) => {
            try {
                const packetLogs = logger.getPacketLogs();
                const limit = parseInt(req.query.limit) || 1000;
                const offset = parseInt(req.query.offset) || 0;
                
                const paginatedLogs = packetLogs.slice(offset, offset + limit);
                
                res.json({
                    success: true,
                    logs: paginatedLogs,
                    total: packetLogs.length,
                    limit,
                    offset,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('Failed to get packet logs', error);
                res.status(500).json({ error: 'Failed to get packet logs' });
            }
        });

        // Get packet logs for dashboard display
        this.app.get('/api/logs/packet-logs', (req, res) => {
            try {
                const packetLogs = logger.getPacketLogs();
                res.json({
                    success: true,
                    logs: packetLogs,
                    total: packetLogs.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('Failed to get packet logs', error);
                res.status(500).json({ error: 'Failed to get packet logs' });
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
        this.app.post('/api/admin/room/:roomId/close', requireAdmin, (req, res) => {
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

        // Get individual bots list
        this.app.get('/api/bots', (req, res) => {
            try {
                const botManager = require('../core/botManager');
                const stats = botManager.getBotStats();
                
                // Convert bot data to expected format
                const bots = [];
                if (stats.isRunning && stats.botDetails) {
                    stats.botDetails.forEach(bot => {
                        bots.push({
                            id: bot.uid,
                            name: bot.nickname,
                            status: 'online',
                            type: 'Chat Bot',
                            room: bot.roomName,
                            roomId: bot.roomId,
                            uptime: Math.floor((Date.now() - bot.createdAt) / 1000),
                            personality: bot.chatPersonality,
                            textStyle: bot.textStyle
                        });
                    });
                }
                
                res.json({
                    success: true,
                    bots: bots,
                    stats: {
                        total: stats.totalBots,
                        active: stats.isRunning ? stats.totalBots : 0,
                        paused: 0,
                        error: 0
                    }
                });
            } catch (error) {
                logger.error('Failed to get bots list', error);
                res.status(500).json({ success: false, error: 'Failed to get bots list' });
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
                        logger.info('Bots stopped via web interface', { stoppedCount: result.stoppedCount });
                        
                        // Ensure server state is updated with removed bots
                        // Trigger a manual clean-up of any remaining bot users
                        this.serverState.cleanupDisconnectedUsers();
                        
                        const response = {
                            success: true,
                            data: {
                                message: result.message,
                                stoppedCount: result.stoppedCount
                            }
                        };
                        res.json(response);
                        
                        // Broadcast update to all connected dashboards
                        this.io.emit('botStatus', { 
                            isRunning: false, 
                            activeBots: 0,
                            timestamp: new Date().toISOString()
                        });
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
        const jwt = require('jsonwebtoken');
        
        // Socket.io middleware to check for authentication
        this.io.use((socket, next) => {
            const req = socket.request;
            
            // If session is authenticated, allow connection
            if (req.session && req.session.isAuthenticated) {
                socket.user = {
                    id: req.session.userId,
                    username: req.session.username,
                    isAdmin: req.session.isAdmin
                };
                return next();
            }
            
            // Check for token in cookies or query
            const cookieHeader = req.headers.cookie;
            if (cookieHeader) {
                const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                    const [name, value] = cookie.trim().split('=');
                    acc[name] = value;
                    return acc;
                }, {});
                
                const token = cookies[SECURITY_SETTINGS.DASHBOARD_COOKIE_NAME];
                
                if (token) {
                    try {
                        const decoded = jwt.verify(token, SECURITY_SETTINGS.JWT_SECRET);
                        socket.user = {
                            id: decoded.id,
                            username: decoded.username,
                            isAdmin: decoded.isAdmin
                        };
                        return next();
                    } catch (error) {
                        // Invalid token
                    }
                }
            }
            
            // No authentication found
            return next(new Error('Authentication required'));
        });

        this.io.on('connection', (socket) => {
            logger.info('Web client connected', { 
                socketId: socket.id, 
                user: socket.user
            });
            
            // Send initial data
            this.sendServerState(socket);
            
            socket.on('disconnect', () => {
                logger.debug('Web client disconnected', { 
                    socketId: socket.id, 
                    user: socket.user 
                });
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

        // Listen for packet logging events
        logger.on('packetLogged', (packetData) => {
            this.io.emit('packetLogged', packetData);
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
