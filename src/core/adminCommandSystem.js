/**
 * Advanced admin command system for Paltalk Server
 */
const logger = require('../utils/logger');
const Utils = require('../utils/utils');
const { USER_PERMISSIONS } = require('../config/constants');

class AdminCommandSystem {
    constructor(serverState, packetProcessor) {
        this.serverState = serverState;
        this.packetProcessor = packetProcessor;
        this.commandHistory = new Map(); // userId -> command history
        this.setupCommands();
    }

    setupCommands() {
        this.commands = {
            '/help': {
                description: 'Show available commands',
                permission: USER_PERMISSIONS.REGULAR,
                handler: this.handleHelp.bind(this)
            },
            '/users': {
                description: 'Show online user count and details',
                permission: USER_PERMISSIONS.MODERATOR,
                handler: this.handleUsers.bind(this)
            },
            '/rooms': {
                description: 'Show active room statistics',
                permission: USER_PERMISSIONS.MODERATOR,
                handler: this.handleRooms.bind(this)
            },
            '/stats': {
                description: 'Show detailed server statistics',
                permission: USER_PERMISSIONS.ADMIN,
                handler: this.handleStats.bind(this)
            },
            '/kick': {
                description: 'Kick a user (usage: /kick <nickname> [reason])',
                permission: USER_PERMISSIONS.MODERATOR,
                handler: this.handleKick.bind(this)
            },
            '/ban': {
                description: 'Ban a user (usage: /ban <nickname> [reason])',
                permission: USER_PERMISSIONS.ADMIN,
                handler: this.handleBan.bind(this)
            },
            '/unban': {
                description: 'Unban a user (usage: /unban <nickname>)',
                permission: USER_PERMISSIONS.ADMIN,
                handler: this.handleUnban.bind(this)
            },
            '/broadcast': {
                description: 'Send message to all users (usage: /broadcast <message>)',
                permission: USER_PERMISSIONS.ADMIN,
                handler: this.handleBroadcast.bind(this)
            },
            '/room-broadcast': {
                description: 'Send message to room (usage: /room-broadcast <room_id> <message>)',
                permission: USER_PERMISSIONS.MODERATOR,
                handler: this.handleRoomBroadcast.bind(this)
            },
            '/shutdown': {
                description: 'Gracefully shutdown server (usage: /shutdown [delay_seconds])',
                permission: USER_PERMISSIONS.SUPER_ADMIN,
                handler: this.handleShutdown.bind(this)
            },
            '/reload': {
                description: 'Reload server configuration',
                permission: USER_PERMISSIONS.ADMIN,
                handler: this.handleReload.bind(this)
            },
            '/performance': {
                description: 'Show performance metrics',
                permission: USER_PERMISSIONS.ADMIN,
                handler: this.handlePerformance.bind(this)
            },
            '/voice-stats': {
                description: 'Show voice server statistics',
                permission: USER_PERMISSIONS.MODERATOR,
                handler: this.handleVoiceStats.bind(this)
            }
        };
    }

    /**
     * Process admin command
     * @param {User} user 
     * @param {string} commandLine 
     * @returns {string}
     */
    processCommand(user, commandLine) {
        try {
            const args = commandLine.trim().split(' ');
            const command = args[0].toLowerCase();
            const params = args.slice(1);

            // Store command in history
            this.storeCommandHistory(user.uid, commandLine);

            // Check if command exists
            if (!this.commands[command]) {
                return `Unknown command: ${command}. Type /help for available commands.`;
            }

            // Check permissions
            const cmdInfo = this.commands[command];
            if (user.admin < cmdInfo.permission) {
                logger.warn('Unauthorized command attempt', {
                    userId: user.uid,
                    nickname: user.nickname,
                    command,
                    userPermission: user.admin,
                    requiredPermission: cmdInfo.permission
                });
                return 'Access denied. Insufficient permissions.';
            }

            // Execute command
            return cmdInfo.handler(user, params);

        } catch (error) {
            logger.error('Error processing admin command', error, {
                userId: user.uid,
                command: commandLine
            });
            return 'Error executing command. Please check logs for details.';
        }
    }

    storeCommandHistory(userId, command) {
        if (!this.commandHistory.has(userId)) {
            this.commandHistory.set(userId, []);
        }
        
        const history = this.commandHistory.get(userId);
        history.push({
            command,
            timestamp: new Date(),
            executedAt: Date.now()
        });

        // Keep only last 50 commands
        if (history.length > 50) {
            history.shift();
        }
    }

    // Command handlers

    handleHelp(user, params) {
        const availableCommands = Object.entries(this.commands)
            .filter(([cmd, info]) => user.admin >= info.permission)
            .map(([cmd, info]) => `${cmd} - ${info.description}`)
            .join('\\n');

        return `Available commands:\\n${availableCommands}`;
    }

    handleUsers(user, params) {
        const onlineUsers = this.serverState.getOnlineUsers();
        const userSummary = this.serverState.getUserActivitySummary();
        
        let response = `Online Users: ${onlineUsers.length}\\n`;
        response += `Active: ${userSummary.active}, Idle: ${userSummary.idle}, Away: ${userSummary.away}\\n`;
        
        if (params[0] === 'list' && user.admin >= USER_PERMISSIONS.ADMIN) {
            response += '\\nUser List:\\n';
            onlineUsers.slice(0, 20).forEach(u => {
                response += `- ${u.nickname} (UID: ${u.uid}) [${u.mode === 30 ? 'Online' : 'Away'}]\\n`;
            });
            if (onlineUsers.length > 20) {
                response += `... and ${onlineUsers.length - 20} more users`;
            }
        }

        return response;
    }

    handleRooms(user, params) {
        const rooms = this.serverState.getAllRooms();
        const roomStats = this.serverState.getRoomStatistics();
        
        let response = `Active Rooms: ${rooms.length}\\n`;
        
        roomStats.forEach(room => {
            response += `- ${room.name} (ID: ${room.id}) - ${room.userCount}/${room.maxUsers} users\\n`;
        });

        return response;
    }

    handleStats(user, params) {
        const stats = this.serverState.getStats();
        
        return `Server Statistics:\\n` +
               `Uptime: ${stats.uptimeFormatted}\\n` +
               `Total Connections: ${stats.totalConnections}\\n` +
               `Current Users: ${stats.currentUsers}\\n` +
               `Peak Users: ${stats.peakConcurrentUsers}\\n` +
               `Total Packets: ${stats.totalPacketsReceived}\\n` +
               `Total Messages: ${stats.totalMessagesProcessed}\\n` +
               `Memory Usage: ${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB`;
    }

    handleKick(user, params) {
        if (params.length === 0) {
            return 'Usage: /kick <nickname> [reason]';
        }

        const targetNickname = params[0];
        const reason = params.slice(1).join(' ') || 'Kicked by admin';
        
        const targetUser = this.serverState.getOnlineUsers()
            .find(u => u.nickname.toLowerCase() === targetNickname.toLowerCase());

        if (!targetUser) {
            return `User '${targetNickname}' not found or not online.`;
        }

        if (targetUser.admin >= user.admin) {
            return 'Cannot kick user with equal or higher permissions.';
        }

        // Kick user
        this.serverState.removeUserConnection(targetUser.socket, `Kicked: ${reason}`);
        
        logger.info('User kicked by admin', {
            adminId: user.uid,
            adminNickname: user.nickname,
            targetId: targetUser.uid,
            targetNickname: targetUser.nickname,
            reason
        });

        return `User '${targetNickname}' has been kicked. Reason: ${reason}`;
    }

    handleBan(user, params) {
        if (params.length === 0) {
            return 'Usage: /ban <nickname> [reason]';
        }

        // This would implement user banning
        // For now, just return a placeholder
        return 'Ban functionality not yet implemented.';
    }

    handleUnban(user, params) {
        if (params.length === 0) {
            return 'Usage: /unban <nickname>';
        }

        // This would implement user unbanning
        return 'Unban functionality not yet implemented.';
    }

    handleBroadcast(user, params) {
        if (params.length === 0) {
            return 'Usage: /broadcast <message>';
        }

        const message = params.join(' ');
        const broadcastMessage = `[SYSTEM BROADCAST] ${message}`;

        // Send to all online users
        this.serverState.getOnlineUsers().forEach(targetUser => {
            if (targetUser.socket) {
                this.packetProcessor.sendSystemMessage(targetUser.socket, broadcastMessage);
            }
        });

        logger.info('Global broadcast sent', {
            adminId: user.uid,
            adminNickname: user.nickname,
            message
        });

        return `Broadcast sent to ${this.serverState.getOnlineUsers().length} users.`;
    }

    handleRoomBroadcast(user, params) {
        if (params.length < 2) {
            return 'Usage: /room-broadcast <room_id> <message>';
        }

        const roomId = parseInt(params[0]);
        const message = params.slice(1).join(' ');
        const room = this.serverState.getRoom(roomId);

        if (!room) {
            return `Room with ID ${roomId} not found.`;
        }

        const broadcastMessage = `[ROOM BROADCAST] ${message}`;
        this.packetProcessor.broadcastToRoom(room, 0x015e, 
            Buffer.from(broadcastMessage, 'utf8'));

        return `Broadcast sent to room '${room.name}' (${room.users.size} users).`;
    }

    handleShutdown(user, params) {
        const delay = params[0] ? parseInt(params[0]) : 10;
        
        if (isNaN(delay) || delay < 0) {
            return 'Invalid delay. Must be a positive number of seconds.';
        }

        logger.warn('Server shutdown initiated by admin', {
            adminId: user.uid,
            adminNickname: user.nickname,
            delay
        });

        // Broadcast shutdown warning
        const shutdownMessage = `Server will shutdown in ${delay} seconds. Please save your work.`;
        this.handleBroadcast(user, [shutdownMessage]);

        // Schedule shutdown
        setTimeout(() => {
            logger.info('Server shutting down as scheduled');
            process.exit(0);
        }, delay * 1000);

        return `Server shutdown scheduled in ${delay} seconds.`;
    }

    handleReload(user, params) {
        // This would reload configuration
        logger.info('Configuration reload requested', {
            adminId: user.uid,
            adminNickname: user.nickname
        });
        
        return 'Configuration reload functionality not yet implemented.';
    }

    handlePerformance(user, params) {
        const stats = this.serverState.getStats();
        const memUsage = process.memoryUsage();
        
        return `Performance Metrics:\\n` +
               `Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB used of ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB\\n` +
               `CPU: ${JSON.stringify(process.cpuUsage())}\\n` +
               `Process Uptime: ${Math.round(process.uptime())}s\\n` +
               `Avg Query Time: ${stats.performanceMetrics?.lastUpdate ? 'Available' : 'N/A'}`;
    }

    handleVoiceStats(user, params) {
        // This would get voice server statistics
        return 'Voice server statistics not yet implemented.';
    }

    /**
     * Get command history for a user
     * @param {number} userId 
     * @returns {Array}
     */
    getCommandHistory(userId) {
        return this.commandHistory.get(userId) || [];
    }
}

module.exports = AdminCommandSystem;
