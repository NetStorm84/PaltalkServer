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
                action: 'join_room', // Everyone can use help
                handler: this.handleHelp.bind(this)
            },
            '/users': {
                description: 'Show online user count and details',
                action: 'kick_user', // Moderator action
                handler: this.handleUsers.bind(this)
            },
            '/rooms': {
                description: 'Show active room statistics',
                action: 'kick_user', // Moderator action
                handler: this.handleRooms.bind(this)
            },
            '/stats': {
                description: 'Show detailed server statistics',
                action: 'manage_server', // Admin action
                handler: this.handleStats.bind(this)
            },
            '/kick': {
                description: 'Kick a user (usage: /kick <nickname> [reason])',
                action: 'kick_user', // Moderator action
                handler: this.handleKick.bind(this)
            },
            '/ban': {
                description: 'Ban a user (usage: /ban <nickname> [reason])',
                action: 'ban_user',
                handler: this.handleBan.bind(this)
            },
            '/unban': {
                description: 'Unban a user (usage: /unban <nickname>)',
                action: 'ban_user',
                handler: this.handleUnban.bind(this)
            },
            '/broadcast': {
                description: 'Send message to all users (usage: /broadcast <message>)',
                action: 'ban_user',
                handler: this.handleBroadcast.bind(this)
            },
            '/room-broadcast': {
                description: 'Send message to room (usage: /room-broadcast <room_id> <message>)',
                action: 'kick_user',
                handler: this.handleRoomBroadcast.bind(this)
            },
            '/shutdown': {
                description: 'Gracefully shutdown server (usage: /shutdown [delay_seconds])',
                action: 'manage_server',
                handler: this.handleShutdown.bind(this)
            },
            '/reload': {
                description: 'Reload server configuration',
                action: 'ban_user',
                handler: this.handleReload.bind(this)
            },
            '/performance': {
                description: 'Show performance metrics',
                action: 'ban_user',
                handler: this.handlePerformance.bind(this)
            },
            '/voice-stats': {
                description: 'Show voice server statistics',
                action: 'kick_user',
                handler: this.handleVoiceStats.bind(this)
            },
            '/reddot': {
                description: 'Red dot a user (usage: /reddot <nickname> [room_id])',
                action: 'kick_user',
                handler: this.handleRedDot.bind(this)
            },
            '/unreddot': {
                description: 'Remove red dot from user (usage: /unreddot <nickname> [room_id])',
                action: 'kick_user',
                handler: this.handleUnredDot.bind(this)
            },
            '/reddot-all': {
                description: 'Red dot all users in room (usage: /reddot-all <room_id>)',
                action: 'ban_user',
                handler: this.handleRedDotAll.bind(this)
            },
            '/unreddot-all': {
                description: 'Remove red dot from all users in room (usage: /unreddot-all <room_id>)',
                action: 'ban_user',
                handler: this.handleUnredDotAll.bind(this)
            },
            '/reddot-text': {
                description: 'Toggle red dot affecting text privileges (usage: /reddot-text <room_id> <on|off>)',
                action: 'ban_user',
                handler: this.handleRedDotTextToggle.bind(this)
            },
            '/reddot-video': {
                description: 'Toggle red dot affecting video privileges (usage: /reddot-video <room_id> <on|off>)',
                action: 'ban_user',
                handler: this.handleRedDotVideoToggle.bind(this)
            },
            '/reddot-status': {
                description: 'Show red dot status for room (usage: /reddot-status <room_id>)',
                action: 'kick_user',
                handler: this.handleRedDotStatus.bind(this)
            },
            '/grant-mic': {
                description: 'Grant mic to user (usage: /grant-mic <nickname> [room_id])',
                action: 'kick_user',
                handler: this.handleGrantMic.bind(this)
            },
            '/remove-mic': {
                description: 'Remove mic from user (usage: /remove-mic <nickname> [room_id])',
                action: 'kick_user',
                handler: this.handleRemoveMic.bind(this)
            },
            '/clear-hands': {
                description: 'Clear all mic requests in room (usage: /clear-hands <room_id>)',
                action: 'kick_user',
                handler: this.handleClearHands.bind(this)
            },
            '/mic-status': {
                description: 'Show mic request status for room (usage: /mic-status <room_id>)',
                action: 'kick_user',
                handler: this.handleMicStatus.bind(this)
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

            // Check permissions using new system
            const cmdInfo = this.commands[command];
            if (!user.hasPermission(cmdInfo.action)) {
                logger.warn('Unauthorized command attempt', {
                    userId: user.uid,
                    nickname: user.nickname,
                    command,
                    userAdmin: user.admin,
                    userModerator: user.sup,
                    requiredAction: cmdInfo.action
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
            .filter(([cmd, info]) => user.hasPermission(info.action))
            .map(([cmd, info]) => `${cmd} - ${info.description}`)
            .join('\\n');

        return `Available commands:\\n${availableCommands}`;
    }

    handleUsers(user, params) {
        const onlineUsers = this.serverState.getOnlineUsers();
        const userSummary = this.serverState.getUserActivitySummary();
        
        let response = `Online Users: ${onlineUsers.length}\\n`;
        response += `Active: ${userSummary.active}, Idle: ${userSummary.idle}, Away: ${userSummary.away}\\n`;
        
        if (params[0] === 'list' && user.hasPermission('ban_user')) {
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

        // Admins can kick moderators and regular users, but not other admins
        // Moderators can kick regular users but not admins or other moderators with admin privileges
        if (targetUser.admin === 1 && !user.isAdmin()) {
            return 'Cannot kick an admin user.';
        }
        if (targetUser.admin === 1 && user.admin === 1 && targetUser.uid !== user.uid) {
            return 'Cannot kick another admin user.';
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

    handleRedDot(user, params) {
        if (params.length === 0) {
            return 'Usage: /reddot <nickname> [room_id]';
        }

        const targetNickname = params[0];
        const roomId = params[1] ? parseInt(params[1]) : null;

        // Find target user
        const targetUser = this.serverState.getOnlineUsers()
            .find(u => u.nickname.toLowerCase() === targetNickname.toLowerCase());

        if (!targetUser) {
            return `User '${targetNickname}' not found or not online.`;
        }

        // If no room specified, use user's current room
        let room;
        if (roomId) {
            room = this.serverState.getRoom(roomId);
            if (!room) {
                return `Room with ID ${roomId} not found.`;
            }
        } else {
            // Get user's current room (first room they're in)
            const userRooms = Array.from(this.serverState.getAllRooms())
                .filter(r => r.hasUser(targetUser.uid));
            if (userRooms.length === 0) {
                return `User '${targetNickname}' is not in any room.`;
            }
            room = userRooms[0];
        }

        // Check if admin user is in the room and has admin privileges
        const adminRoomUser = room.getUser(user.uid);
        if (!adminRoomUser || !adminRoomUser.admin) {
            return `You must be an admin in room '${room.name}' to use red dot commands.`;
        }

        // Check if target is in the room
        if (!room.hasUser(targetUser.uid)) {
            return `User '${targetNickname}' is not in room '${room.name}'.`;
        }

        // Apply red dot using the packet processor method
        this.packetProcessor.applyRedDotToUser(room, targetUser.uid, true);

        logger.info('Red dot applied via admin command', {
            adminId: user.uid,
            adminNickname: user.nickname,
            targetId: targetUser.uid,
            targetNickname: targetUser.nickname,
            roomId: room.id,
            roomName: room.name
        });

        return `Red dot applied to '${targetNickname}' in room '${room.name}'.`;
    }

    handleUnredDot(user, params) {
        if (params.length === 0) {
            return 'Usage: /unreddot <nickname> [room_id]';
        }

        const targetNickname = params[0];
        const roomId = params[1] ? parseInt(params[1]) : null;

        // Find target user
        const targetUser = this.serverState.getOnlineUsers()
            .find(u => u.nickname.toLowerCase() === targetNickname.toLowerCase());

        if (!targetUser) {
            return `User '${targetNickname}' not found or not online.`;
        }

        // If no room specified, use user's current room
        let room;
        if (roomId) {
            room = this.serverState.getRoom(roomId);
            if (!room) {
                return `Room with ID ${roomId} not found.`;
            }
        } else {
            // Get user's current room (first room they're in)
            const userRooms = Array.from(this.serverState.getAllRooms())
                .filter(r => r.hasUser(targetUser.uid));
            if (userRooms.length === 0) {
                return `User '${targetNickname}' is not in any room.`;
            }
            room = userRooms[0];
        }

        // Check if admin user is in the room and has admin privileges
        const adminRoomUser = room.getUser(user.uid);
        if (!adminRoomUser || !adminRoomUser.admin) {
            return `You must be an admin in room '${room.name}' to use red dot commands.`;
        }

        // Check if target is in the room
        if (!room.hasUser(targetUser.uid)) {
            return `User '${targetNickname}' is not in room '${room.name}'.`;
        }

        // Remove red dot using the packet processor method
        this.packetProcessor.applyRedDotToUser(room, targetUser.uid, false);

        logger.info('Red dot removed via admin command', {
            adminId: user.uid,
            adminNickname: user.nickname,
            targetId: targetUser.uid,
            targetNickname: targetUser.nickname,
            roomId: room.id,
            roomName: room.name
        });

        return `Red dot removed from '${targetNickname}' in room '${room.name}'.`;
    }

    handleRedDotAll(user, params) {
        if (params.length === 0) {
            return 'Usage: /reddot-all <room_id>';
        }

        const roomId = parseInt(params[0]);
        const room = this.serverState.getRoom(roomId);

        if (!room) {
            return `Room with ID ${roomId} not found.`;
        }

        // Check if admin user has admin privileges in this room
        const adminRoomUser = room.getUser(user.uid);
        if (!adminRoomUser || !adminRoomUser.admin) {
            return `You must be an admin in room '${room.name}' to use red dot commands.`;
        }

        let affectedCount = 0;
        room.getAllUsers().forEach(userData => {
            if (userData.uid !== user.uid) { // Don't red dot the admin
                this.packetProcessor.applyRedDotToUser(room, userData.uid, true);
                affectedCount++;
            }
        });

        logger.info('Red dot applied to all users via admin command', {
            adminId: user.uid,
            adminNickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            affectedCount
        });

        return `Red dot applied to ${affectedCount} users in room '${room.name}'.`;
    }

    handleUnredDotAll(user, params) {
        if (params.length === 0) {
            return 'Usage: /unreddot-all <room_id>';
        }

        const roomId = parseInt(params[0]);
        const room = this.serverState.getRoom(roomId);

        if (!room) {
            return `Room with ID ${roomId} not found.`;
        }

        // Check if admin user has admin privileges in this room
        const adminRoomUser = room.getUser(user.uid);
        if (!adminRoomUser || !adminRoomUser.admin) {
            return `You must be an admin in room '${room.name}' to use red dot commands.`;
        }

        let affectedCount = 0;
        room.getAllUsers().forEach(userData => {
            if (userData.redDot) {
                this.packetProcessor.applyRedDotToUser(room, userData.uid, false);
                affectedCount++;
            }
        });

        logger.info('Red dot removed from all users via admin command', {
            adminId: user.uid,
            adminNickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            affectedCount
        });

        return `Red dot removed from ${affectedCount} users in room '${room.name}'.`;
    }

    handleRedDotTextToggle(user, params) {
        if (params.length < 2) {
            return 'Usage: /reddot-text <room_id> <on|off>';
        }

        const roomId = parseInt(params[0]);
        const toggle = params[1].toLowerCase();
        const room = this.serverState.getRoom(roomId);

        if (!room) {
            return `Room with ID ${roomId} not found.`;
        }

        if (toggle !== 'on' && toggle !== 'off') {
            return 'Toggle must be "on" or "off".';
        }

        // Check if admin user has admin privileges in this room
        const adminRoomUser = room.getUser(user.uid);
        if (!adminRoomUser || !adminRoomUser.admin) {
            return `You must be an admin in room '${room.name}' to change red dot settings.`;
        }

        room.redDotAffectsText = (toggle === 'on');

        logger.info('Red dot text effect toggled via admin command', {
            adminId: user.uid,
            adminNickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            redDotAffectsText: room.redDotAffectsText
        });

        return `Red dot text effect ${toggle} for room '${room.name}'.`;
    }

    handleRedDotVideoToggle(user, params) {
        if (params.length < 2) {
            return 'Usage: /reddot-video <room_id> <on|off>';
        }

        const roomId = parseInt(params[0]);
        const toggle = params[1].toLowerCase();
        const room = this.serverState.getRoom(roomId);

        if (!room) {
            return `Room with ID ${roomId} not found.`;
        }

        if (toggle !== 'on' && toggle !== 'off') {
            return 'Toggle must be "on" or "off".';
        }

        // Check if admin user has admin privileges in this room
        const adminRoomUser = room.getUser(user.uid);
        if (!adminRoomUser || !adminRoomUser.admin) {
            return `You must be an admin in room '${room.name}' to change red dot settings.`;
        }

        room.redDotAffectsVideo = (toggle === 'on');

        logger.info('Red dot video effect toggled via admin command', {
            adminId: user.uid,
            adminNickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            redDotAffectsVideo: room.redDotAffectsVideo
        });

        return `Red dot video effect ${toggle} for room '${room.name}'.`;
    }

    handleRedDotStatus(user, params) {
        if (params.length === 0) {
            return 'Usage: /reddot-status <room_id>';
        }

        const roomId = parseInt(params[0]);
        const room = this.serverState.getRoom(roomId);

        if (!room) {
            return `Room with ID ${roomId} not found.`;
        }

        const redDottedUsers = room.getRedDottedUsers();
        
        let response = `Red Dot Status for room '${room.name}' (ID: ${room.id}):\\n`;
        response += `Text privileges affected: ${room.redDotAffectsText ? 'Yes' : 'No'}\\n`;
        response += `Video privileges affected: ${room.redDotAffectsVideo ? 'Yes' : 'No'}\\n`;
        response += `Voice privileges affected: Always (standard behavior)\\n\\n`;
        
        if (redDottedUsers.length === 0) {
            response += 'No users currently have red dot status.';
        } else {
            response += `Red dotted users (${redDottedUsers.length}):\\n`;
            redDottedUsers.forEach(userData => {
                response += `- ${userData.nickname} (UID: ${userData.uid})\\n`;
            });
        }

        return response;
    }

    handleGrantMic(user, params) {
        if (params.length === 0) {
            return 'Usage: /grant-mic <nickname> [room_id]';
        }

        const targetNickname = params[0];
        const roomId = params[1] ? parseInt(params[1]) : null;

        // Find target user
        const targetUser = this.serverState.getOnlineUsers()
            .find(u => u.nickname.toLowerCase() === targetNickname.toLowerCase());

        if (!targetUser) {
            return `User '${targetNickname}' not found or not online.`;
        }

        // Find room
        let room;
        if (roomId) {
            room = this.serverState.getRoom(roomId);
            if (!room) {
                return `Room with ID ${roomId} not found.`;
            }
        } else {
            // Get user's current room
            const userRooms = Array.from(this.serverState.getAllRooms())
                .filter(r => r.hasUser(targetUser.uid));
            if (userRooms.length === 0) {
                return `User '${targetNickname}' is not in any room.`;
            }
            room = userRooms[0];
        }

        // Check if admin has privileges in this room
        const adminRoomUser = room.getUser(user.uid);
        if (!adminRoomUser || !adminRoomUser.admin) {
            return `You must be an admin in room '${room.name}' to grant mic.`;
        }

        // Check if target is in the room
        if (!room.hasUser(targetUser.uid)) {
            return `User '${targetNickname}' is not in room '${room.name}'.`;
        }

        // Grant mic permissions
        const roomUser = room.getUser(targetUser.uid);
        if (roomUser) {
            roomUser.mic = 1;
        }
        targetUser.mic = 1;

        // Clear mic request status if they were requesting
        if (room.isUserRequestingMic(targetUser.uid)) {
            room.setUserMicRequest(targetUser.uid, false);
        }

        // Send mic granted notification
        const { PACKET_TYPES } = require('../../PacketHeaders');
        const { sendPacket } = require('../utils/packetSender');
        const Utils = require('../utils/utils');

        const micGrantedData = Buffer.from(
            Utils.decToHex(room.id) + Utils.decToHex(targetUser.uid) + '01', // 01 = mic granted
            'hex'
        );

        room.getAllUsers().forEach(otherUserData => {
            const otherUser = this.serverState.getUser(otherUserData.uid);
            if (otherUser && otherUser.socket) {
                sendPacket(otherUser.socket, PACKET_TYPES.PACKET_ROOM_MIC_GIVEN_REMOVED, micGrantedData, otherUser.socket.id);
            }
        });

        logger.info('Mic granted via admin command', {
            adminId: user.uid,
            adminNickname: user.nickname,
            targetId: targetUser.uid,
            targetNickname: targetUser.nickname,
            roomId: room.id,
            roomName: room.name
        });

        return `Mic granted to '${targetNickname}' in room '${room.name}'.`;
    }

    handleRemoveMic(user, params) {
        if (params.length === 0) {
            return 'Usage: /remove-mic <nickname> [room_id]';
        }

        const targetNickname = params[0];
        const roomId = params[1] ? parseInt(params[1]) : null;

        // Find target user
        const targetUser = this.serverState.getOnlineUsers()
            .find(u => u.nickname.toLowerCase() === targetNickname.toLowerCase());

        if (!targetUser) {
            return `User '${targetNickname}' not found or not online.`;
        }

        // Find room
        let room;
        if (roomId) {
            room = this.serverState.getRoom(roomId);
            if (!room) {
                return `Room with ID ${roomId} not found.`;
            }
        } else {
            // Get user's current room
            const userRooms = Array.from(this.serverState.getAllRooms())
                .filter(r => r.hasUser(targetUser.uid));
            if (userRooms.length === 0) {
                return `User '${targetNickname}' is not in any room.`;
            }
            room = userRooms[0];
        }

        // Check if admin has privileges in this room
        const adminRoomUser = room.getUser(user.uid);
        if (!adminRoomUser || !adminRoomUser.admin) {
            return `You must be an admin in room '${room.name}' to remove mic.`;
        }

        // Check if target is in the room
        if (!room.hasUser(targetUser.uid)) {
            return `User '${targetNickname}' is not in room '${room.name}'.`;
        }

        // Remove mic permissions
        const roomUser = room.getUser(targetUser.uid);
        if (roomUser) {
            roomUser.mic = 0;
        }
        targetUser.mic = 0;

        // Send mic removed notification
        const { PACKET_TYPES } = require('../../PacketHeaders');
        const { sendPacket } = require('../utils/packetSender');
        const Utils = require('../utils/utils');

        const micRemovedData = Buffer.from(
            Utils.decToHex(room.id) + Utils.decToHex(targetUser.uid) + '00', // 00 = mic removed
            'hex'
        );

        room.getAllUsers().forEach(otherUserData => {
            const otherUser = this.serverState.getUser(otherUserData.uid);
            if (otherUser && otherUser.socket) {
                sendPacket(otherUser.socket, PACKET_TYPES.PACKET_ROOM_MIC_GIVEN_REMOVED, micRemovedData, otherUser.socket.id);
            }
        });

        logger.info('Mic removed via admin command', {
            adminId: user.uid,
            adminNickname: user.nickname,
            targetId: targetUser.uid,
            targetNickname: targetUser.nickname,
            roomId: room.id,
            roomName: room.name
        });

        return `Mic removed from '${targetNickname}' in room '${room.name}'.`;
    }

    handleClearHands(user, params) {
        if (params.length === 0) {
            return 'Usage: /clear-hands <room_id>';
        }

        const roomId = parseInt(params[0]);
        const room = this.serverState.getRoom(roomId);

        if (!room) {
            return `Room with ID ${roomId} not found.`;
        }

        // Check if admin has privileges in this room
        const adminRoomUser = room.getUser(user.uid);
        if (!adminRoomUser || !adminRoomUser.admin) {
            return `You must be an admin in room '${room.name}' to clear hands.`;
        }

        const requestingUsers = room.getUsersRequestingMic();
        let clearedCount = 0;

        const { PACKET_TYPES } = require('../../PacketHeaders');
        const { sendPacket } = require('../utils/packetSender');
        const Utils = require('../utils/utils');

        requestingUsers.forEach(userData => {
            // Clear mic request status
            room.setUserMicRequest(userData.uid, false);

            // Send mic unrequest notification
            const micRequestData = Buffer.concat([
                Buffer.from(Utils.decToHex(room.id), 'hex'),
                Buffer.from(Utils.decToHex(userData.uid), 'hex')
            ]);

            room.getAllUsers().forEach(otherUserData => {
                const otherUser = this.serverState.getUser(otherUserData.uid);
                if (otherUser && otherUser.socket) {
                    sendPacket(otherUser.socket, PACKET_TYPES.PACKET_ROOM_USER_MICREQUEST_OFF, micRequestData, otherUser.socket.id);
                }
            });

            clearedCount++;
        });

        logger.info('All hands cleared via admin command', {
            adminId: user.uid,
            adminNickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            clearedCount
        });

        return `Cleared ${clearedCount} mic requests in room '${room.name}'.`;
    }

    handleMicStatus(user, params) {
        if (params.length === 0) {
            return 'Usage: /mic-status <room_id>';
        }

        const roomId = parseInt(params[0]);
        const room = this.serverState.getRoom(roomId);

        if (!room) {
            return `Room with ID ${roomId} not found.`;
        }

        const requestingUsers = room.getUsersRequestingMic();
        const usersWithMic = room.getAllUsers().filter(u => u.mic === 1);
        
        let response = `Mic Status for room '${room.name}' (ID: ${room.id}):\\n`;
        response += `Room type: ${room.isVoice ? 'Voice' : 'Text'}\\n`;
        response += `Mic enabled: ${room.micEnabled ? 'Yes' : 'No'}\\n\\n`;
        
        if (usersWithMic.length > 0) {
            response += `Users with mic (${usersWithMic.length}):\\n`;
            usersWithMic.forEach(userData => {
                response += `- ${userData.nickname} (UID: ${userData.uid})\\n`;
            });
            response += '\\n';
        }

        if (requestingUsers.length === 0) {
            response += 'No users currently requesting mic.';
        } else {
            response += `Users requesting mic (${requestingUsers.length}):\\n`;
            requestingUsers.forEach(userData => {
                response += `- ${userData.nickname} (UID: ${userData.uid})\\n`;
            });
        }

        return response;
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
