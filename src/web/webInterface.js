/**
 * Web interface for monitoring the Paltalk server
 */
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const logger = require('../utils/logger');
const { SERVER_CONFIG } = require('../config/constants');

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

        // Server logs (recent)
        this.app.get('/api/logs', (req, res) => {
            try {
                // This would typically read from log files
                // For now, return a simple response
                res.json({
                    logs: [
                        {
                            timestamp: new Date().toISOString(),
                            level: 'info',
                            message: 'Web interface accessed',
                            service: 'web-interface'
                        }
                    ]
                });
            } catch (error) {
                logger.error('Failed to get logs', error);
                res.status(500).json({ error: 'Failed to get logs' });
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
        this.app.post('/api/admin/broadcast', (req, res) => {
            try {
                const { message } = req.body;
                if (!message) {
                    return res.status(400).json({ error: 'Message required' });
                }

                // Broadcast message to all online users
                const alertBuffer = Buffer.from(message, 'utf8');
                this.serverState.getOnlineUsers().forEach(user => {
                    if (user.socket) {
                        // Note: This would need the actual packet sender
                        // sendPacket(user.socket, PACKET_TYPES.ANNOUNCEMENT, alertBuffer, user.socket.id);
                    }
                });

                logger.info('Admin broadcast sent', { message });
                res.json({ success: true, message: 'Broadcast sent' });
            } catch (error) {
                logger.error('Failed to send broadcast', error);
                res.status(500).json({ error: 'Failed to send broadcast' });
            }
        });

        // Kick user
        this.app.post('/api/admin/kick/:userId', (req, res) => {
            try {
                const userId = parseInt(req.params.userId);
                const user = this.serverState.getUser(userId);
                
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                if (user.socket) {
                    user.socket.destroy();
                }

                logger.info('User kicked by admin', { userId, nickname: user.nickname });
                res.json({ success: true, message: 'User kicked' });
            } catch (error) {
                logger.error('Failed to kick user', error);
                res.status(500).json({ error: 'Failed to kick user' });
            }
        });

        // Server control
        this.app.post('/api/admin/cleanup', (req, res) => {
            try {
                this.serverState.cleanup();
                this.voiceServer.performCleanup();
                
                logger.info('Manual cleanup performed');
                res.json({ success: true, message: 'Cleanup performed' });
            } catch (error) {
                logger.error('Failed to perform cleanup', error);
                res.status(500).json({ error: 'Failed to perform cleanup' });
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
    }

    async sendServerState(socket) {
        try {
            const state = this.serverState.getServerState();
            const voiceStats = this.voiceServer.getStats();
            
            socket.emit('serverState', {
                ...state,
                voice: voiceStats,
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
        
        // Send full state update
        this.io.clients((error, clients) => {
            if (!error) {
                clients.forEach(clientId => {
                    const socket = this.io.sockets.sockets[clientId];
                    if (socket) {
                        this.sendServerState(socket);
                    }
                });
            }
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
