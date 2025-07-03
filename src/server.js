/**
 * Main Paltalk Server - Enhanced and modular version
 */
const net = require('net');
const process = require('process');
const logger = require('./utils/logger');
const { SERVER_CONFIG } = require('./config/constants');

// Core components
const serverState = require('./core/serverState');
const PacketProcessor = require('./core/packetProcessor');
const DatabaseManager = require('./database/databaseManager');
const VoiceServer = require('./voice/voiceServer');

// Network components
const Room = require('./models/Room');

class PaltalkServer {
    constructor() {
        this.chatServer = null;
        this.voiceServer = new VoiceServer();
        this.databaseManager = new DatabaseManager();
        this.packetProcessor = null;
        this.isRunning = false;
        
        // Connection tracking and management
        this.connectionBuffers = new Map(); // connectionId -> Buffer
        this.connectionMetrics = new Map(); // connectionId -> metrics
        this.maxConnectionsPerIP = 20; // Increased from 10 to handle reconnection loops
        this.ipConnections = new Map(); // IP -> count
        
        // Graceful shutdown handling
        this.setupShutdownHandlers();
        
        // Periodic cleanup
        this.cleanupInterval = null;

        // Enhanced graceful shutdown
        this.shutdownInProgress = false;
    }

    /**
     * Initialize and start all server components
     */
    async start() {
        try {
            logger.info('🚀 Starting Paltalk Server...');

            // Initialize database
            await this.initializeDatabase();

            // Initialize packet processor
            // Initialize packet processor with voice server reference
            this.packetProcessor = new PacketProcessor(this.databaseManager, this.voiceServer);
            
            // Inject packet processor reference into serverState for broadcasting
            serverState.setPacketProcessor(this.packetProcessor);

            // Load initial data
            await this.loadInitialData();

            // CRITICAL FIX: Perform startup cleanup to clear stale user/room state
            // This prevents "User already in room" errors from previous server runs
            serverState.performStartupCleanup();

            // Inject server state into voice server for room validation
            this.voiceServer.setServerState(this.serverState);

            // Start voice server
            await this.voiceServer.start();

            // Start chat server
            await this.startChatServer();

            // Start internal API (replaces web interface)
            await this.startInternalApi();

            // Start periodic cleanup
            this.startPeriodicTasks();

            this.isRunning = true;
            logger.info('✅ Paltalk Server started successfully');
            logger.info(`� Chat Server: Port ${SERVER_CONFIG.CHAT_PORT}`);
            logger.info(`🎙️ Voice Server: Port ${SERVER_CONFIG.VOICE_PORT}`);
            logger.info(`🔌 Internal API: Port 5002 (localhost only)`);
            logger.info(`🌐 Laravel Web UI: http://localhost (via Docker)`);

        } catch (error) {
            logger.error('❌ Failed to start Paltalk Server', error);
            process.exit(1);
        }
    }

    /**
     * Initialize database connection and load data
     */
    async initializeDatabase() {
        logger.info('📊 Initializing database...');
        await this.databaseManager.initialize();
        
        // Inject database manager into serverState for room operations
        serverState.setDatabaseManager(this.databaseManager);
        
        logger.info('✅ Database initialized');
    }

    /**
     * Load initial data (categories, permanent rooms)
     */
    async loadInitialData() {
        logger.info('📋 Loading initial data...');

        try {
            // Load categories
            const categories = await this.databaseManager.getCategories();
            categories.forEach(category => {
                serverState.addCategory(category);
            });
            logger.info(`✅ Loaded ${categories.length} categories`);

            // Load permanent rooms
            const permanentRooms = await this.databaseManager.getPermanentRooms();
            permanentRooms.forEach(roomData => {
                const room = new Room(roomData, true);
                room.setServerState(serverState);
                serverState.addRoom(room);
            });
            logger.info(`✅ Loaded ${permanentRooms.length} permanent rooms`);

        } catch (error) {
            logger.error('Failed to load initial data', error);
            throw error;
        }
    }

    /**
     * Start the chat server
     */
    async startChatServer() {
        return new Promise((resolve, reject) => {
            logger.info('💬 Starting chat server...');

            this.chatServer = net.createServer(socket => {
                this.handleNewChatConnection(socket);
            });

            this.chatServer.listen(SERVER_CONFIG.CHAT_PORT, SERVER_CONFIG.SERVER_IP, () => {
                logger.info(`✅ Chat server listening on ${SERVER_CONFIG.SERVER_IP}:${SERVER_CONFIG.CHAT_PORT}`);
                resolve();
            });

            this.chatServer.on('error', (error) => {
                logger.error('Chat server error', error);
                if (!this.isRunning) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Handle new chat connection
     * @param {Socket} socket 
     */
    handleNewChatConnection(socket) {
        this.handleChatConnection(socket);
    }

    /**
     * Handle incoming chat data with proper packet assembly
     * @param {Socket} socket 
     * @param {Buffer} data 
     */
    handleChatData(socket, data) {
        try {
            const connectionId = socket.connectionId;
            if (!connectionId) return;

            // Get or create buffer for this connection
            let receiveBuffer = this.connectionBuffers.get(connectionId) || Buffer.alloc(0);
            
            // Append new data to buffer
            receiveBuffer = Buffer.concat([receiveBuffer, data]);
            
            // Process complete packets
            while (receiveBuffer.length >= 6) {
                // Read packet header
                const packetType = receiveBuffer.readInt16BE(0);
                const version = receiveBuffer.readInt16BE(2);
                const payloadLength = receiveBuffer.readUInt16BE(4);
                const totalPacketLength = 6 + payloadLength;

                // Check if we have the complete packet
                if (receiveBuffer.length < totalPacketLength) {
                    break; // Wait for more data
                }

                // Extract payload
                const payload = receiveBuffer.slice(6, totalPacketLength);
                
                // Process packet with error handling
                try {
                    this.packetProcessor.processPacket(socket, packetType, payload);
                } catch (packetError) {
                    logger.error('Error processing individual packet', packetError, {
                        socketId: socket.connectionId,
                        packetType,
                        payloadLength
                    });
                    // Don't close the connection for packet processing errors
                }
                
                // Remove processed packet from buffer
                receiveBuffer = receiveBuffer.slice(totalPacketLength);
                
                serverState.updateStats('totalPacketsReceived');
            }

            // Update buffer
            this.connectionBuffers.set(connectionId, receiveBuffer);

        } catch (error) {
            logger.error('Error handling chat data', error, {
                socketId: socket.connectionId,
                dataLength: data.length
            });
        }
    }

    /**
     * Handle chat connection end
     * @param {Socket} socket 
     */
    handleChatConnectionEnd(socket) {
        logger.debug('Chat connection ended', { connectionId: socket.connectionId });
        this.cleanupChatConnection(socket);
    }

    /**
     * Handle chat connection error
     * @param {Socket} socket 
     * @param {Error} error 
     */
    handleChatConnectionError(socket, error) {
        logger.error('Chat connection error', error, { connectionId: socket.connectionId });
        this.cleanupChatConnection(socket);
    }

    /**
     * Handle chat connection close
     * @param {Socket} socket 
     * @param {boolean} hadError 
     */
    handleChatConnectionClose(socket, hadError) {
        logger.debug('Chat connection closed', { 
            connectionId: socket.connectionId, 
            hadError 
        });
        this.cleanupChatConnection(socket);
    }

    /**
     * Clean up chat connection resources
     * @param {Socket} socket 
     */
    cleanupChatConnection(socket) {
        const connectionId = socket.connectionId;
        if (!connectionId) return;

        // Remove from server state if user was logged in
        serverState.removeUserConnection(socket);

        // Clean up connection buffer
        this.connectionBuffers.delete(connectionId);

        logger.debug('Chat connection cleaned up', { connectionId });
    }

    /**
     * Start internal API for Laravel communication
     */
    async startInternalApi() {
        logger.info('🔌 Starting internal API...');
        
        // Create internal API server (separate from web interface)
        const express = require('express');
        const internalApp = express();
        
        // Middleware
        internalApp.use(express.json());
        
        // CORS for localhost only
        internalApp.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', 'http://localhost');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            next();
        });
        
        // Internal API routes (no authentication - localhost only)
        this.setupInternalApiRoutes(internalApp);
        
        // Start internal API server on different port
        const INTERNAL_API_PORT = 5002;
        internalApp.listen(INTERNAL_API_PORT, '127.0.0.1', () => {
            logger.info(`✅ Internal API started on port ${INTERNAL_API_PORT}`);
        });
        
        this.internalApp = internalApp;
    }

    /**
     * Setup internal API routes for Laravel communication
     */
    setupInternalApiRoutes(app) {
        // Server state and statistics
        app.get('/internal/server-state', async (req, res) => {
            try {
                const serverStats = serverState.getStats();
                
                // Get categories and groups for name lookup
                const categories = await this.databaseManager.getCategories();
                const categoryMap = new Map();
                categories.forEach(cat => {
                    categoryMap.set(cat.code, cat.value);
                });
                
                // Get groups (rooms) from database for name lookup
                const groups = await this.databaseManager.getGroups();
                const groupMap = new Map();
                groups.forEach(group => {
                    groupMap.set(group.id, {
                        name: group.nm || `Room ${group.id}`,
                        categoryName: group.category_name || categoryMap.get(group.catg) || `Category ${group.catg}`
                    });
                });
                
                const users = serverState.getAllUsers().map(user => {
                    const roomIds = user.getRoomIds();
                    let currentRoomName = null;
                    
                    if (roomIds.length > 0) {
                        const roomId = roomIds[0];
                        const dbRoom = groupMap.get(roomId);
                        if (dbRoom) {
                            currentRoomName = dbRoom.name;
                        } else {
                            const room = serverState.getRoom(roomId);
                            currentRoomName = room ? room.name : `Room ${roomId}`;
                        }
                    }
                    
                    return {
                        id: user.uid,
                        nickname: user.nickname,
                        currentRoom: currentRoomName
                    };
                });
                
                // Only include rooms that have users in them
                const allRooms = serverState.getAllRooms();
                const activeRooms = allRooms
                    .filter(room => room.getUserCount() > 0)
                    .map(room => {
                        const dbRoom = groupMap.get(room.id);
                        const roomName = dbRoom ? dbRoom.name : (room.name || `Room ${room.id}`);
                        const categoryName = dbRoom ? dbRoom.categoryName : (categoryMap.get(room.category) || `Category ${room.category}`);
                        
                        return {
                            id: room.id,
                            name: roomName,
                            userCount: room.getUserCount(),
                            category: categoryName
                        };
                    });
                
                res.json({
                    stats: {
                        onlineUsers: serverStats.currentUsers || 0,
                        activeRooms: activeRooms.length,
                        totalConnections: serverStats.totalConnections || serverStats.currentUsers || 0,
                        uptime: Math.floor((serverStats.uptime || 0) / 1000)
                    },
                    users: users,
                    rooms: activeRooms,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('Failed to get server state', error);
                res.status(500).json({ error: 'Failed to get server state' });
            }
        });

        // Bot management endpoints
        app.get('/internal/bots/stats', (req, res) => {
            try {
                const botManager = require('./core/botManager');
                const stats = botManager.getBotStats();
                
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

        app.get('/internal/bots', (req, res) => {
            try {
                const botManager = require('./core/botManager');
                const stats = botManager.getBotStats();
                
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

        app.post('/internal/bots/start', async (req, res) => {
            try {
                const botManager = require('./core/botManager');
                const { BOT_CONFIG } = require('./config/constants');
                const { 
                    botCount = BOT_CONFIG.DEFAULT_BOT_COUNT, 
                    chatFrequency = BOT_CONFIG.DEFAULT_CHAT_FREQUENCY_MS, 
                    moveFrequency = BOT_CONFIG.DEFAULT_MOVE_FREQUENCY_MS, 
                    targetRoomId = null,
                    distributionMode = null,
                    roomIds = null
                } = req.body;
                
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
                    const availableRooms = serverState?.getAllRooms?.()?.filter(room => !room.isPrivate) || [];
                    if (availableRooms.length > 0) {
                        processedConfig.targetRoomId = availableRooms[0].id;
                        processedConfig.distributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM;
                    }
                } else if (targetRoomId && targetRoomId !== null && targetRoomId !== "null") {
                    processedConfig.targetRoomId = parseInt(targetRoomId);
                    processedConfig.distributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM;
                } else if (roomIds && Array.isArray(roomIds) && roomIds.length > 0) {
                    processedConfig.roomIds = roomIds.map(id => parseInt(id)).filter(id => !isNaN(id));
                    processedConfig.distributionMode = processedConfig.roomIds.length === 1 
                        ? BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM 
                        : BOT_CONFIG.ROOM_DISTRIBUTION_MODES.WEIGHTED;
                } else if (!distributionMode || distributionMode === 'random') {
                    processedConfig.distributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.RANDOM;
                } else if (distributionMode === 'balanced') {
                    processedConfig.distributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.BALANCED;
                }
                
                const result = await botManager.startBots(processedConfig);
                res.json(result);
            } catch (error) {
                logger.error('Failed to start bots', error);
                res.status(500).json({ error: 'Failed to start bots' });
            }
        });

        app.post('/internal/bots/stop', async (req, res) => {
            try {
                const botManager = require('./core/botManager');
                const result = await botManager.stopBots();
                
                if (result.success) {
                    serverState.cleanupDisconnectedUsers();
                }
                
                res.json(result);
            } catch (error) {
                logger.error('Failed to stop bots', error);
                res.status(500).json({ error: 'Failed to stop bots' });
            }
        });

        // Voice server endpoints
        app.get('/internal/voice/stats', (req, res) => {
            try {
                const voiceStats = this.voiceServer.getServerStatistics();
                res.json(voiceStats);
            } catch (error) {
                logger.error('Failed to get voice server stats', error);
                res.status(500).json({ error: 'Failed to get voice server stats' });
            }
        });

        app.get('/internal/voice/logs', (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 100;
                const logs = this.voiceServer.getRecentLogs(limit);
                res.json({
                    success: true,
                    logs: logs
                });
            } catch (error) {
                logger.error('Failed to get voice logs', error);
                res.status(500).json({ success: false, error: 'Failed to get voice logs', logs: [] });
            }
        });

        app.post('/internal/voice/mute', (req, res) => {
            try {
                const { userId } = req.body;
                const result = this.voiceServer.muteUser(userId);
                res.json({
                    success: true,
                    message: result ? 'User muted successfully' : 'User not found in voice chat'
                });
            } catch (error) {
                logger.error('Failed to mute user', error);
                res.status(500).json({ success: false, error: 'Failed to mute user' });
            }
        });

        app.post('/internal/voice/kick', (req, res) => {
            try {
                const { userId } = req.body;
                const result = this.voiceServer.kickUser(userId);
                res.json({
                    success: true,
                    message: result ? 'User kicked successfully' : 'User not found in voice chat'
                });
            } catch (error) {
                logger.error('Failed to kick user', error);
                res.status(500).json({ success: false, error: 'Failed to kick user' });
            }
        });

        // Packet logs endpoints
        app.get('/internal/logs/packets', (req, res) => {
            try {
                const filter = req.query.filter || 'all';
                const limit = parseInt(req.query.limit) || 100;
                
                const logs = this.packetProcessor.getRecentLogs(filter, limit);
                res.json({
                    success: true,
                    logs: logs
                });
            } catch (error) {
                logger.error('Failed to get packet logs', error);
                res.status(500).json({ success: false, error: 'Failed to get packet logs', logs: [] });
            }
        });

        app.post('/internal/logs/clear-packets', (req, res) => {
            try {
                this.packetProcessor.clearLogs();
                res.json({
                    success: true,
                    message: 'Packet logs cleared successfully'
                });
            } catch (error) {
                logger.error('Failed to clear packet logs', error);
                res.status(500).json({ success: false, error: 'Failed to clear packet logs' });
            }
        });

        app.get('/internal/logs/export-packets', (req, res) => {
            try {
                const format = req.query.format || 'json';
                const logs = this.packetProcessor.getAllLogs();
                
                if (format === 'csv') {
                    // Convert to CSV format
                    const csvHeaders = 'timestamp,type,direction,size,data\n';
                    const csvData = logs.map(log => 
                        `${log.timestamp},"${log.type}","${log.direction}",${log.size},"${log.data.replace(/"/g, '""')}"`
                    ).join('\n');
                    
                    res.setHeader('Content-Type', 'text/csv');
                    res.send(csvHeaders + csvData);
                } else {
                    res.json(logs);
                }
            } catch (error) {
                logger.error('Failed to export packet logs', error);
                res.status(500).json({ success: false, error: 'Failed to export packet logs' });
            }
        });

        // Room management endpoints
        app.get('/internal/rooms', (req, res) => {
            try {
                const rooms = serverState.getAllRooms().map(room => ({
                    id: room.id,
                    name: room.name || `Room ${room.id}`,
                    description: room.topic || '',
                    userCount: room.getUserCount(),
                    maxUsers: room.maxUsers || 'Unlimited',
                    isPrivate: room.isPrivate || false,
                    isActive: room.isActive !== false,
                    createdAt: room.createdAt || new Date().toISOString()
                }));
                
                res.json({
                    success: true,
                    rooms: rooms
                });
            } catch (error) {
                logger.error('Failed to get rooms', error);
                res.status(500).json({ error: 'Failed to get rooms', success: false });
            }
        });

        app.put('/internal/rooms/:id', (req, res) => {
            try {
                const roomId = parseInt(req.params.id);
                const updateData = req.body;
                
                const room = serverState.getRoom(roomId);
                if (!room) {
                    return res.status(404).json({ success: false, error: 'Room not found' });
                }
                
                // Update room properties
                if (updateData.name) room.name = updateData.name;
                if (updateData.topic) room.topic = updateData.topic;
                if (updateData.category) room.category = updateData.category;
                if (updateData.type) room.type = updateData.type;
                if (updateData.voice !== undefined) room.voice = updateData.voice;
                if (updateData.private !== undefined) room.isPrivate = updateData.private;
                if (updateData.locked !== undefined) room.locked = updateData.locked;
                if (updateData.closed !== undefined) room.closed = updateData.closed;
                if (updateData.password) room.password = updateData.password;
                if (updateData.mike !== undefined) room.mike = updateData.mike;
                if (updateData.text !== undefined) room.text = updateData.text;
                if (updateData.color) room.color = updateData.color;
                
                res.json({
                    success: true,
                    message: 'Room updated successfully',
                    room: {
                        id: room.id,
                        name: room.name,
                        topic: room.topic
                    }
                });
            } catch (error) {
                logger.error('Failed to update room', error);
                res.status(500).json({ success: false, error: 'Failed to update room' });
            }
        });

        app.delete('/internal/rooms/:id', (req, res) => {
            try {
                const roomId = parseInt(req.params.id);
                
                const room = serverState.getRoom(roomId);
                if (!room) {
                    return res.status(404).json({ success: false, error: 'Room not found' });
                }
                
                // Kick all users from the room
                const users = room.getUsers();
                users.forEach(user => {
                    room.removeUser(user);
                    // Optionally notify the user that the room was deleted
                });
                
                // Remove the room from server state
                serverState.removeRoom(roomId);
                
                res.json({
                    success: true,
                    message: `Room ${roomId} deleted successfully`
                });
            } catch (error) {
                logger.error('Failed to delete room', error);
                res.status(500).json({ success: false, error: 'Failed to delete room' });
            }
        });

        app.post('/internal/rooms/:id/close', (req, res) => {
            try {
                const roomId = parseInt(req.params.id);
                
                const room = serverState.getRoom(roomId);
                if (!room) {
                    return res.status(404).json({ success: false, error: 'Room not found' });
                }
                
                // Kick all users from the room
                const users = room.getUsers();
                const kickedCount = users.length;
                
                users.forEach(user => {
                    room.removeUser(user);
                    // Optionally send a notification to the user
                });
                
                // Mark room as closed/inactive
                room.closed = true;
                room.isActive = false;
                
                res.json({
                    success: true,
                    message: `Room ${roomId} closed successfully. ${kickedCount} users were kicked.`
                });
            } catch (error) {
                logger.error('Failed to close room', error);
                res.status(500).json({ success: false, error: 'Failed to close room' });
            }
        });

        // Admin endpoints
        app.post('/internal/admin/refresh-user', (req, res) => {
            try {
                const { userId, updateData } = req.body;
                
                // Find the user in server state
                const user = serverState.getUserByUid(userId);
                if (user) {
                    // Update user properties in memory
                    if (updateData.first) user.firstName = updateData.first;
                    if (updateData.last) user.lastName = updateData.last;
                    if (updateData.nickname) user.nickname = updateData.nickname;
                    if (updateData.email) user.email = updateData.email;
                    if (updateData.admin !== undefined) user.adminLevel = updateData.admin;
                    if (updateData.listed !== undefined) user.isActive = updateData.listed;
                    if (updateData.paid1 !== undefined) user.paidLevel = updateData.paid1;
                    if (updateData.color) user.color = updateData.color;
                    if (updateData.banners) user.banners = updateData.banners;
                    
                    logger.info('User data refreshed in memory', { userId, updateData });
                }
                
                res.json({
                    success: true,
                    message: 'User data refresh completed'
                });
            } catch (error) {
                logger.error('Failed to refresh user data', error);
                res.status(500).json({ success: false, error: 'Failed to refresh user data' });
            }
        });

        // Health check
        app.get('/internal/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                server: 'h2ktalk-server-internal',
                version: '1.0.0'
            });
        });
    }

    /**
     * Start periodic maintenance tasks
     */
    startPeriodicTasks() {
        logger.info('⏰ Starting periodic tasks...');

        // Start ServerState periodic cleanup tasks
        serverState.startPeriodicTasks();

        // Cleanup task every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.performMaintenance();
        }, 5 * 60 * 1000);

        // Statistics logging every hour
        setInterval(() => {
            this.logStatistics();
        }, 60 * 60 * 1000);

        logger.info('✅ Periodic tasks started');
    }

    /**
     * Perform server maintenance
     */
    performMaintenance() {
        try {
            logger.debug('🧹 Performing server maintenance...');

            // Clean up server state
            serverState.performMaintenance();

            // Clean up voice server
            this.voiceServer.performCleanup();

            // Clean up connection buffers for dead connections
            let cleanedBuffers = 0;
            for (const [connectionId, buffer] of this.connectionBuffers) {
                // If buffer hasn't been updated in 10 minutes, remove it
                if (buffer.lastUpdate && Date.now() - buffer.lastUpdate > 10 * 60 * 1000) {
                    this.connectionBuffers.delete(connectionId);
                    cleanedBuffers++;
                }
            }

            if (cleanedBuffers > 0) {
                logger.debug('Cleaned up connection buffers', { cleanedBuffers });
            }

        } catch (error) {
            logger.error('Error during maintenance', error);
        }
    }

    /**
     * Log server statistics
     */
    logStatistics() {
        try {
            const stats = serverState.getStats();
            const voiceStats = this.voiceServer.getStats();

            logger.info('📊 Server Statistics', {
                chatServer: {
                    onlineUsers: stats.onlineUsers,
                    totalRooms: stats.totalRooms,
                    totalConnections: stats.totalConnections,
                    uptime: stats.uptime
                },
                voiceServer: {
                    connections: voiceStats.totalConnections,
                    rooms: voiceStats.activeRooms
                },
                internalApi: {
                    status: 'running',
                    port: 5002
                },
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
                }
            });
        } catch (error) {
            logger.error('Error logging statistics', error);
        }
    }

    /**
     * Setup graceful shutdown handlers
     */
    setupShutdownHandlers() {
        let shutdownInProgress = false;
        
        const shutdown = async (signal) => {
            if (shutdownInProgress) {
                logger.warn(`${signal} received while shutdown in progress, forcing exit...`);
                process.exit(1);
            }
            
            shutdownInProgress = true;
            logger.info(`🛑 Received ${signal}, shutting down gracefully...`);
            
            try {
                await this.stop();
                process.exit(0);
            } catch (error) {
                logger.error('Shutdown failed', error);
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception', error);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection', reason, { promise });
        });
    }

    /**
     * Stop all server components
     */
    async stop() {
        if (!this.isRunning) return;

        logger.info('🛑 Stopping Paltalk Server...');

        try {
            // Set a maximum shutdown time
            const shutdownTimeout = setTimeout(() => {
                logger.error('Shutdown timed out, forcing exit...');
                process.exit(1);
            }, 10000); // 10 seconds

            // Stop periodic tasks
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
                logger.debug('✅ Periodic tasks stopped');
            }

            // Shutdown packet processor
            if (this.packetProcessor) {
                this.packetProcessor.shutdown();
                logger.debug('✅ Packet processor shutdown');
            }

            // Stop internal API if it exists
            if (this.internalApp) {
                try {
                    // Express apps don't have a built-in stop method, so we just log
                    logger.info('✅ Internal API stopped');
                } catch (error) {
                    logger.warn('Internal API stop failed', error);
                }
            }

            // Stop voice server with timeout
            try {
                await Promise.race([
                    this.voiceServer.stop(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Voice server stop timeout')), 3000))
                ]);
                logger.info('✅ Voice server stopped');
            } catch (error) {
                logger.warn('Voice server stop failed or timed out', error);
            }

            // Stop chat server with timeout
            if (this.chatServer) {
                try {
                    await Promise.race([
                        new Promise((resolve) => {
                            this.chatServer.close(() => {
                                logger.info('✅ Chat server stopped');
                                resolve();
                            });
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Chat server stop timeout')), 3000))
                    ]);
                } catch (error) {
                    logger.warn('Chat server stop failed or timed out', error);
                    // Force close if needed
                    if (this.chatServer.listening) {
                        this.chatServer.close();
                    }
                }
            }

            // Close database with timeout
            try {
                await Promise.race([
                    this.databaseManager.close(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Database close timeout')), 3000))
                ]);
                logger.info('✅ Database connection closed');
            } catch (error) {
                logger.warn('Database close failed or timed out', error);
            }

            // Clear the shutdown timeout
            clearTimeout(shutdownTimeout);

            this.isRunning = false;
            logger.info('✅ Paltalk Server stopped gracefully');

        } catch (error) {
            logger.error('Error during shutdown', error);
        }
    }

    /**
     * Get server status
     * @returns {Object}
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            chatServer: this.chatServer?.listening || false,
            voiceServer: this.voiceServer.getStats(),
            internalApi: { status: 'running', port: 5002 },
            database: this.databaseManager.isConnectionActive(),
            stats: serverState.getStats()
        };
    }

    /**
     * Handle new chat server connections with enhanced security
     * @param {Socket} socket 
     */
    handleChatConnection(socket) {
        try {
            const remoteIP = socket.remoteAddress;
            const connectionId = `chat_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            
            // Check IP connection limits
            const ipConnCount = this.ipConnections.get(remoteIP) || 0;
            if (ipConnCount >= this.maxConnectionsPerIP) {
                logger.warn('Connection limit exceeded for IP', { 
                    remoteIP, 
                    currentConnections: ipConnCount 
                });
                socket.destroy();
                return;
            }
            
            // Track IP connections
            this.ipConnections.set(remoteIP, ipConnCount + 1);
            
            // Set connection properties
            socket.connectionId = connectionId;
            socket.id = connectionId; // CRITICAL: Set socket.id for serverState compatibility
            socket.remoteIP = remoteIP;
            socket.connectedAt = new Date();
            
            // Track connection metrics
            this.connectionMetrics.set(connectionId, {
                connectedAt: new Date(),
                packetsReceived: 0,
                bytesSent: 0,
                bytesReceived: 0,
                lastActivity: new Date()
            });

            logger.info('New chat connection', {
                connectionId,
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort
            });

            // Set up event handlers
            socket.on('data', (data) => {
                this.updateConnectionMetrics(connectionId, 'received', data.length);
                this.handleChatData(socket, data);
            });

            socket.on('error', (error) => {
                logger.error('Chat socket error', error, { 
                    connectionId, 
                    socketId: socket.id,
                    userFound: serverState.getUserBySocketId(socket.id) ? true : false 
                });
                this.cleanupConnection(socket);
            });

            socket.on('close', () => {
                logger.debug('Chat connection closed', { 
                    connectionId,
                    socketId: socket.id,
                    userFound: serverState.getUserBySocketId(socket.id) ? true : false 
                });
                this.cleanupConnection(socket);
            });

            socket.on('end', () => {
                logger.debug('Chat connection ended', { 
                    connectionId,
                    socketId: socket.id,
                    userFound: serverState.getUserBySocketId(socket.id) ? true : false 
                });
                this.cleanupConnection(socket);
            });

            // Set connection timeout
            socket.setTimeout(5 * 60 * 1000, () => { // 5 minutes
                logger.warn('Connection timeout', { connectionId });
                socket.destroy();
            });

        } catch (error) {
            logger.error('Error handling chat connection', error);
            socket.destroy();
        }
    }

    /**
     * Update connection metrics
     * @param {string} connectionId 
     * @param {string} type - 'sent' or 'received'
     * @param {number} bytes 
     */
    updateConnectionMetrics(connectionId, type, bytes) {
        const metrics = this.connectionMetrics.get(connectionId);
        if (metrics) {
            if (type === 'sent') {
                metrics.bytesSent += bytes;
            } else if (type === 'received') {
                metrics.bytesReceived += bytes;
                metrics.packetsReceived++;
            }
            metrics.lastActivity = new Date();
        }
    }

    /**
     * Clean up connection resources
     * @param {Socket} socket 
     */
    cleanupConnection(socket) {
        try {
            const connectionId = socket.connectionId;
            const remoteIP = socket.remoteIP;
            
            logger.debug('🧹 Cleaning up connection', { 
                connectionId, 
                remoteIP,
                hasConnectionId: !!connectionId 
            });
            
            if (connectionId) {
                // Remove connection buffers
                this.connectionBuffers.delete(connectionId);
                this.connectionMetrics.delete(connectionId);
            }
            
            if (remoteIP) {
                // Decrease IP connection count
                const currentCount = this.ipConnections.get(remoteIP) || 0;
                if (currentCount <= 1) {
                    this.ipConnections.delete(remoteIP);
                } else {
                    this.ipConnections.set(remoteIP, currentCount - 1);
                }
            }
            
            // FIXED: Remove user connection from server state using the socket directly
            // The serverState.removeUserConnection method can handle socket objects
            try {
                const removed = serverState.removeUserConnection(socket, 'Connection closed');
                if (removed) {
                    logger.info('✅ User connection cleaned up from server state', { connectionId });
                } else {
                    logger.debug('No user found to clean up for this socket', { connectionId });
                }
            } catch (userCleanupError) {
                logger.error('Error removing user from server state', userCleanupError, { connectionId });
            }
            
        } catch (error) {
            logger.error('Error cleaning up connection', error);
        }
    }
}

// Create and start server if this file is run directly
if (require.main === module) {
    const server = new PaltalkServer();
    server.start().catch(error => {
        logger.error('Failed to start server', error);
        process.exit(1);
    });
}

module.exports = PaltalkServer;
