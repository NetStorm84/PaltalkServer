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
        this.app.post('/api/admin/kick-user', (req, res) => {
            try {
                const { userId, reason } = req.body;
                
                if (!userId) {
                    return res.status(400).json({ error: 'User ID required' });
                }
                
                const user = this.serverState.getUser(userId);
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                
                // Kick user
                this.serverState.removeUserConnection(user.socket, `Kicked by admin: ${reason || 'No reason provided'}`);
                
                logger.info('User kicked by admin', { userId, reason });
                res.json({ success: true, message: 'User kicked successfully' });
            } catch (error) {
                logger.error('Failed to kick user', error);
                res.status(500).json({ error: 'Failed to kick user' });
            }
        });

        this.app.post('/api/admin/broadcast', (req, res) => {
            try {
                const { message } = req.body;
                
                if (!message || message.trim().length === 0) {
                    return res.status(400).json({ error: 'Message required' });
                }
                
                // Broadcast to all users
                this.serverState.getOnlineUsers().forEach(user => {
                    if (user.socket) {
                        const messageBuffer = Buffer.from(`SYSTEM: ${message}`, 'utf8');
                        user.socket.write(messageBuffer);
                    }
                });
                
                logger.info('Admin broadcast sent', { message });
                res.json({ success: true, message: 'Broadcast sent successfully' });
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
            const stats = this.serverState.getStats();
            const voiceStats = this.voiceServer.getStats();
            
            // Get detailed user and room data for the dashboard
            const users = this.serverState.getOnlineUsers().map(user => ({
                uid: user.uid,
                nickname: user.nickname,
                mode: user.mode,
                isAdmin: user.isAdmin(),
                currentRoom: user.currentRoom?.name || null,
                loginTime: user.loginTime,
                lastActivity: user.lastActivity
            }));
            
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
