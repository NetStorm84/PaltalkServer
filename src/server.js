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
const WebInterface = require('./web/webInterface');

// Network components
const Room = require('./models/Room');

class PaltalkServer {
    constructor() {
        this.chatServer = null;
        this.voiceServer = new VoiceServer();
        this.webInterface = null;
        this.databaseManager = new DatabaseManager();
        this.packetProcessor = null;
        this.isRunning = false;
        
        // Connection tracking and management
        this.connectionBuffers = new Map(); // connectionId -> Buffer
        this.connectionMetrics = new Map(); // connectionId -> metrics
        this.maxConnectionsPerIP = 10;
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
            this.packetProcessor = new PacketProcessor(this.databaseManager);

            // Load initial data
            await this.loadInitialData();

            // Start voice server
            await this.voiceServer.start();

            // Start chat server
            await this.startChatServer();

            // Start web interface
            await this.startWebInterface();

            // Start periodic cleanup
            this.startPeriodicTasks();

            this.isRunning = true;
            logger.info('✅ Paltalk Server started successfully');
            logger.info(`📊 Web Dashboard: http://localhost:${SERVER_CONFIG.WEB_UI_PORT}`);
            logger.info(`💬 Chat Server: Port ${SERVER_CONFIG.CHAT_PORT}`);
            logger.info(`🎙️ Voice Server: Port ${SERVER_CONFIG.VOICE_PORT}`);

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

            this.chatServer.listen(SERVER_CONFIG.CHAT_PORT, () => {
                logger.info(`✅ Chat server listening on port ${SERVER_CONFIG.CHAT_PORT}`);
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
     * Start web interface
     */
    async startWebInterface() {
        logger.info('🌐 Starting web interface...');
        
        this.webInterface = new WebInterface(
            serverState,
            this.voiceServer,
            this.databaseManager
        );
        
        await this.webInterface.start();
        logger.info('✅ Web interface started');
    }

    /**
     * Start periodic maintenance tasks
     */
    startPeriodicTasks() {
        logger.info('⏰ Starting periodic tasks...');

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
            const webStats = this.webInterface?.getStats() || {};

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
                webInterface: {
                    connectedClients: webStats.connectedClients
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

            // Stop web interface with timeout
            if (this.webInterface) {
                try {
                    await Promise.race([
                        this.webInterface.stop(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Web interface stop timeout')), 3000))
                    ]);
                    logger.info('✅ Web interface stopped');
                } catch (error) {
                    logger.warn('Web interface stop failed or timed out', error);
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
            webInterface: this.webInterface?.getStats() || {},
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
                logger.error('Chat socket error', error, { connectionId, 
                    userConnected: socket.id && serverState.getUserBySocketId(socket.id) ? true : false 
                });
                this.cleanupConnection(socket);
            });

            socket.on('close', () => {
                logger.debug('Chat connection closed', { connectionId,
                    userConnected: socket.id && serverState.getUserBySocketId(socket.id) ? true : false 
                });
                this.cleanupConnection(socket);
            });

            socket.on('end', () => {
                logger.debug('Chat connection ended', { connectionId,
                    userConnected: socket.id && serverState.getUserBySocketId(socket.id) ? true : false 
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
            
            // Remove user connection from server state (only if user exists)
            if (socket.id) {
                const user = serverState.getUserBySocketId(socket.id);
                if (user) {
                    serverState.removeUserConnection(socket, 'Connection closed');
                }
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
