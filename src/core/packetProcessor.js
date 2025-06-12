/**
 * Improved packet processor with better organization and error handling
 */
const { PACKET_TYPES } = require('../../packetHeaders');
const { sendPacket } = require('../network/packetSender');
const serverState = require('./serverState');
const User = require('../models/User');
const Room = require('../models/Room');
const Utils = require('../utils/utils');
const logger = require('../utils/logger');
const { USER_MODES, ROOM_TYPES } = require('../config/constants');

class PacketProcessor {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for server state events to handle status broadcasts
        serverState.on('userConnected', (user) => {
            this.broadcastStatusChange(user, USER_MODES.ONLINE);
        });

        serverState.on('userDisconnected', (user) => {
            this.broadcastStatusChange(user, USER_MODES.OFFLINE);
        });
    }

    /**
     * Process incoming packet
     * @param {Socket} socket 
     * @param {number} packetType 
     * @param {Buffer} payload 
     */
    async processPacket(socket, packetType, payload) {
        try {
            serverState.updateStats('totalPacketsReceived');
            
            logger.logPacketReceived(packetType, payload, socket.id);

            switch (packetType) {
                case PACKET_TYPES.CLIENT_HELLO:
                    await this.handleClientHello(socket, payload);
                    break;
                
                case PACKET_TYPES.LYMERICK:
                    await this.handleLymerick(socket, payload);
                    break;
                
                case PACKET_TYPES.LOGIN:
                    await this.handleLogin(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_JOIN:
                    await this.handleRoomJoin(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_LEAVE:
                    await this.handleRoomLeave(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_CREATE:
                    await this.handleRoomCreate(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_MESSAGE_OUT:
                    await this.handleRoomMessage(socket, payload);
                    break;
                
                case PACKET_TYPES.IM_OUT:
                    await this.handleInstantMessage(socket, payload);
                    break;
                
                case PACKET_TYPES.ADD_PAL:
                    await this.handleAddBuddy(socket, payload);
                    break;
                
                case PACKET_TYPES.USER_SEARCH:
                    await this.handleUserSearch(socket, payload);
                    break;
                
                case PACKET_TYPES.REFRESH_CATEGORIES:
                    await this.handleRefreshCategories(socket, payload);
                    break;
                
                case PACKET_TYPES.AWAY_MODE:
                    await this.handleModeChange(socket, USER_MODES.AWAY);
                    break;
                
                case PACKET_TYPES.ONLINE_MODE:
                    await this.handleModeChange(socket, USER_MODES.ONLINE);
                    break;
                
                case PACKET_TYPES.REQ_MIC:
                    await this.handleMicRequest(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_BANNER_MESSAGE:
                    await this.handleRoomBanner(socket, payload);
                    break;

                default:
                    logger.warn('Unhandled packet type', { packetType, socketId: socket.id });
                    break;
            }
        } catch (error) {
            logger.error('Error processing packet', error, {
                packetType,
                socketId: socket.id,
                payloadLength: payload.length
            });
        }
    }

    async handleClientHello(socket, payload) {
        const response = Buffer.from('Hello-From:PaLTALK');
        sendPacket(socket, PACKET_TYPES.HELLO, response, socket.id);
    }

    async handleLymerick(socket, payload) {
        logger.info('Lymerick received', { socketId: socket.id });
        
        sendPacket(socket, PACKET_TYPES.LOGIN_NOT_COMPLETE, Buffer.alloc(0), socket.id);
        
        const serverKey = Buffer.from('XyF¦164473312518');
        sendPacket(socket, PACKET_TYPES.SERVER_KEY, serverKey, socket.id);
    }

    async handleLogin(socket, payload) {
        try {
            const uid = Utils.hexToDec(payload.slice(0, 4));
            const userData = await this.db.getUserByUid(uid);
            
            if (!userData) {
                logger.warn('Login attempt with invalid UID', { uid, socketId: socket.id });
                return;
            }

            const user = new User(userData);
            
            if (!serverState.addUserConnection(socket, user)) {
                logger.error('Failed to add user connection', { uid, socketId: socket.id });
                return;
            }

            // Send user data
            const userDataString = user.getClientData();
            sendPacket(socket, PACKET_TYPES.USER_DATA, Buffer.from(userDataString), socket.id);
            sendPacket(socket, 0x0064, Buffer.from('fb840000', 'hex'), socket.id);

            // Send buddy list
            const buddyList = this.createBuddyListBuffer(user);
            sendPacket(socket, PACKET_TYPES.BUDDY_LIST, buddyList, socket.id);
            sendPacket(socket, 0x0064, Buffer.from('fbbd0000', 'hex'), socket.id);

            // Send buddy status updates
            this.sendBuddyStatusUpdates(socket, user);

            // Required for buddy list window
            sendPacket(socket, PACKET_TYPES.LOGIN_UNKNOWN, Buffer.alloc(0), socket.id);

            // Send categories
            const categoryBuffer = await this.createCategoryBuffer();
            sendPacket(socket, PACKET_TYPES.CATEGORY_LIST, categoryBuffer, socket.id);

            // Send offline messages
            await this.sendOfflineMessages(socket, user);

            logger.logUserAction('login_success', user.uid, {
                nickname: user.nickname,
                sessionId: user.sessionId
            });
        } catch (error) {
            logger.error('Login failed', error, { socketId: socket.id });
        }
    }

    async handleRoomJoin(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const room = serverState.getRoom(roomId);
        
        if (!room) {
            logger.warn('Attempt to join non-existent room', { 
                roomId, 
                userId: user.uid 
            });
            return;
        }

        // Check password if provided
        if (payload.length > 10) {
            const password = payload.slice(10).toString('utf8');
            if (room.password && password !== room.password) {
                logger.warn('Incorrect room password', { 
                    roomId, 
                    userId: user.uid 
                });
                return;
            }
        }

        const isInvisible = payload.slice(4, 6).includes(1);
        const isAdmin = user.isAdmin();

        if (room.addUser(user, !isInvisible, isAdmin)) {
            await this.sendRoomJoinData(socket, room, user, isAdmin);
            this.broadcastUserListUpdate(room);
        }
    }

    async handleRoomLeave(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user || !user.currentRoom) return;

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const room = serverState.getRoom(roomId);
        
        if (room && room.removeUser(user)) {
            // Broadcast user left
            this.broadcastToRoom(room, PACKET_TYPES.ROOM_USER_LEFT, 
                Buffer.from(Utils.decToHex(roomId) + Utils.decToHex(user.uid), 'hex'),
                user.socket
            );

            // Auto-delete temporary rooms
            if (room.shouldAutoDelete()) {
                serverState.removeRoom(room.id);
            }
        }
    }

    async handleRoomCreate(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        const roomType = payload.slice(0, 4);
        const category = Utils.hexToDec(payload.slice(4, 6));
        const rating = payload.slice(10, 11).toString();
        const roomName = payload.slice(11).toString('utf8');

        if (!Utils.isValidInput(roomName, 50)) {
            logger.warn('Invalid room name', { userId: user.uid, roomName });
            return;
        }

        const newRoomData = {
            id: Date.now(), // Simple ID generation
            name: roomName,
            category: category,
            rating: rating,
            isVoice: roomType.toString('hex').includes('03') ? ROOM_TYPES.VOICE : ROOM_TYPES.TEXT,
            topic: 'Welcome to the room!',
            createdBy: user.uid
        };

        const room = new Room(newRoomData, false);
        serverState.addRoom(room);

        // Join the creator as admin
        if (room.addUser(user, true, true)) {
            await this.sendRoomJoinData(socket, room, user, true);
        }
    }

    async handleRoomMessage(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user || !user.currentRoom) return;

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const room = serverState.getRoom(roomId);
        const message = payload.slice(4);

        if (!room || !room.hasUser(user.uid)) return;

        if (!Utils.isValidInput(message.toString('utf8'), 1000)) {
            logger.warn('Invalid room message', { userId: user.uid, roomId });
            return;
        }

        // Broadcast message to all users in room except sender
        const messageBuffer = Buffer.from(
            Utils.decToHex(roomId) + Utils.decToHex(user.uid) + message.toString('hex'),
            'hex'
        );

        this.broadcastToRoom(room, PACKET_TYPES.ROOM_MESSAGE_IN, messageBuffer, user.socket);

        serverState.updateStats('totalMessagesProcessed');
    }

    async handleInstantMessage(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        const receiverUid = Utils.hexToDec(payload.slice(0, 4));
        const content = payload.slice(4);

        if (!Utils.isValidInput(content.toString('utf8'), 2000)) {
            logger.warn('Invalid IM content', { userId: user.uid });
            return;
        }

        // Check for admin commands
        if (receiverUid === 1000001) {
            this.handleAdminCommand(socket, content, user);
            return;
        }

        const receiver = serverState.getUser(receiverUid);
        const messageBuffer = Buffer.concat([
            Buffer.from(Utils.decToHex(user.uid), 'hex'),
            content
        ]);

        if (receiver && receiver.isOnline()) {
            sendPacket(receiver.socket, PACKET_TYPES.IM_IN, messageBuffer, receiver.socket.id);
        } else {
            // Store offline message
            serverState.storeOfflineMessage(user.uid, receiverUid, content.toString('utf8'));
        }

        serverState.updateStats('totalMessagesProcessed');
    }

    async handleAddBuddy(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        const buddyUid = Utils.hexToDec(payload.slice(0, 4));
        const buddyData = await this.db.getUserByUid(buddyUid);
        
        if (!buddyData) {
            logger.warn('Attempt to add non-existent buddy', { 
                userId: user.uid, 
                buddyUid 
            });
            return;
        }

        if (user.addBuddy({ uid: buddyUid, nickname: buddyData.nickname })) {
            // Update database
            await this.db.updateUserBuddies(user.uid, user.buddies);
            
            // Send updated buddy list
            const buddyList = this.createBuddyListBuffer(user);
            sendPacket(socket, PACKET_TYPES.BUDDY_LIST, buddyList, socket.id);
            
            // Send status if buddy is online
            const buddy = serverState.getUser(buddyUid);
            if (buddy && buddy.isOnline()) {
                const statusBuffer = Buffer.from(Utils.decToHex(buddyUid) + '0000001E', 'hex');
                sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, statusBuffer, socket.id);
            }
        }
    }

    async handleUserSearch(socket, payload) {
        const searchQuery = payload.toString('utf8');
        const exactNick = Utils.getValueByKey(searchQuery, 'exnick');
        const startsWith = Utils.getValueByKey(searchQuery, 'nickname');

        let searchResults = [];

        if (exactNick) {
            const users = await this.db.searchUsersByNickname(exactNick, true);
            searchResults = searchResults.concat(users);
        }

        if (startsWith) {
            const users = await this.db.searchUsersByNickname(startsWith, false);
            searchResults = searchResults.concat(users);
        }

        if (searchResults.length > 0) {
            const resultBuffer = this.createSearchResultBuffer(searchResults);
            sendPacket(socket, PACKET_TYPES.SEARCH_RESPONSE, resultBuffer, socket.id);
        }
    }

    async handleRefreshCategories(socket, payload) {
        const categoryId = Utils.hexToDec(payload.slice(8, 12));
        
        if (categoryId === 0) {
            // Send category counts
            const countsBuffer = this.createCategoryCountsBuffer();
            sendPacket(socket, PACKET_TYPES.CATEGORY_COUNT, countsBuffer, socket.id);
        } else {
            // Send room list for category
            const roomsBuffer = this.createRoomListBuffer(categoryId);
            sendPacket(socket, PACKET_TYPES.ROOM_LIST, roomsBuffer, socket.id);
        }
    }

    async handleModeChange(socket, newMode) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        user.setMode(newMode);
        
        const statusBuffer = Buffer.from(Utils.decToHex(user.uid) + 
            (newMode === USER_MODES.AWAY ? '46' : '0000001E'), 'hex');
        
        sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, statusBuffer, socket.id);
        
        // Broadcast to buddies
        this.broadcastStatusChange(user, newMode);
    }

    async handleMicRequest(socket, payload) {
        const roomId = payload.slice(0, 4);
        sendPacket(socket, 0x018d, roomId, socket.id);
    }

    async handleRoomBanner(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user || !user.currentRoom) return;

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const room = serverState.getRoom(roomId);
        const message = payload.slice(4).toString('utf8');
        
        if (!room || !room.hasUser(user.uid) || !user.isAdmin()) return;

        room.setStatusMessage(message, user.uid);
        
        const bannerBuffer = Buffer.from(
            Utils.decToHex(roomId) + '00000000' + payload.slice(4).toString('hex'),
            'hex'
        );
        
        this.broadcastToRoom(room, 0x015f, bannerBuffer);
    }

    handleAdminCommand(socket, content, user) {
        const command = content.toString('utf8').trim().split(' ');
        let response = '';

        switch (command[0]) {
            case '/users':
                response = `There are currently ${serverState.getOnlineUsers().length} users online`;
                break;
            
            case '/rooms':
                response = `There are currently ${serverState.getAllRooms().length} active rooms`;
                break;
            
            case '/alert':
                if (user.isAdmin()) {
                    const message = content.toString('utf8').replace('/alert', '').trim();
                    this.broadcastGlobalAlert(message);
                    response = 'Alert sent to all users';
                } else {
                    response = 'Access denied';
                }
                break;
            
            case '/help':
                response = 'Commands:\n/users - Online user count\n/rooms - Active room count\n/help - Show this help\n/alert <message> - Send global alert (admin only)';
                break;
            
            default:
                response = 'Unknown command. Type /help for available commands.';
                break;
        }

        const responseBuffer = Buffer.concat([
            Buffer.from('000f4241', 'hex'),
            Buffer.from(response, 'utf8')
        ]);

        sendPacket(socket, PACKET_TYPES.IM_IN, responseBuffer, socket.id);
    }

    // Helper methods

    createBuddyListBuffer(user) {
        const buffers = [];
        const delimiter = Buffer.from([0xC8]);

        user.buddies.forEach(buddy => {
            const buddyString = `uid=${buddy.uid}\nnickname=${buddy.nickname}`;
            buffers.push(Buffer.from(buddyString));
            buffers.push(delimiter);
        });

        return Buffer.concat(buffers);
    }

    async createCategoryBuffer() {
        const categories = serverState.getAllCategories();
        const buffers = [];
        const delimiter = Buffer.from([0xC8]);

        categories.forEach(category => {
            const categoryString = `code=${category.code}\nvalue=${category.value}\nlist=2`;
            buffers.push(Buffer.from(categoryString));
            buffers.push(delimiter);
        });

        return Buffer.concat(buffers);
    }

    createCategoryCountsBuffer() {
        const buffers = [];
        const delimiter = Buffer.from([0xC8]);

        serverState.getAllCategories().forEach(category => {
            const count = serverState.getRoomsByCategory(category.code).length;
            if (count > 0) {
                buffers.push(Buffer.from(`id=${category.code}\n#=${count}`));
                buffers.push(delimiter);
            }
        });

        return Buffer.concat(buffers);
    }

    createRoomListBuffer(categoryId) {
        const buffers = [];
        const delimiter = Buffer.from([0xC8]);
        
        buffers.push(Buffer.from(`catg=${categoryId}\n`));
        buffers.push(delimiter);

        const rooms = serverState.getRoomsByCategory(categoryId);
        rooms.forEach(room => {
            const roomString = `id=${room.id}\nnm=${room.name}\n#=${room.getUserCount()}\nv=${room.isVoice}\nl=${room.isListed}\nr=${room.rating}\np=${room.isPrivate}\nc=000000000`;
            buffers.push(Buffer.from(roomString));
            buffers.push(delimiter);
        });

        return Buffer.concat(buffers);
    }

    createSearchResultBuffer(users) {
        const buffers = [];
        const delimiter = Buffer.from([0xC8]);

        users.forEach(user => {
            const userString = `uid=${user.uid}\nnickname=${user.nickname}\nfirst=${user.first || ''}\nlast=${user.last || ''}`;
            buffers.push(Buffer.from(userString));
            buffers.push(delimiter);
        });

        return Buffer.concat(buffers);
    }

    async sendRoomJoinData(socket, room, user, isAdmin) {
        const roomIdHex = Utils.decToHex(room.id);
        let roomType = '00000000';

        if (isAdmin && room.isVoice) roomType = '00030001';
        else if (isAdmin && !room.isVoice) roomType = '00000001';
        else if (!isAdmin && room.isVoice) roomType = '00030000';
        else if (!isAdmin && !room.isVoice) roomType = '00000000';

        const roomDetails = Utils.objectToKeyValueString(room.getRoomDetails());
        const joinBuffer = Buffer.from(
            roomIdHex + roomType + '000000000' + '0b54042a' + '0010006' + '0003' + '47' + 
            Utils.asciiToHex(room.name) + roomDetails,
            'hex'
        );

        sendPacket(socket, 0x0136, joinBuffer, socket.id);

        // Send welcome messages
        this.sendRoomMessage(socket, room.id, room.getWelcomeMessage());
        this.sendRoomMessage(socket, room.id, `${user.nickname}, welcome to the room ${room.name}.`);
        
        // Send topic
        const topicBuffer = Buffer.from(
            roomIdHex + '00000000' + Buffer.from(room.topic).toString('hex'),
            'hex'
        );
        sendPacket(socket, 0x015f, topicBuffer, socket.id);

        // Send user list
        this.sendUserList(socket, room);

        // Send voice server info if voice room
        if (room.isVoice) {
            const ip = socket.localAddress || '127.0.0.1';
            const ipHex = Utils.ipToHex(Utils.extractIPv4(ip));
            const voiceBuffer = Buffer.from(
                roomIdHex + ipHex + '0001869f' + '0000' + '082a',
                'hex'
            );
            sendPacket(socket, PACKET_TYPES.ROOM_MEDIA_SERVER, voiceBuffer, socket.id);
        }
    }

    sendRoomMessage(socket, roomId, message) {
        const messageBuffer = Buffer.from(
            Utils.decToHex(roomId) + '00000000' + Buffer.from(message).toString('hex'),
            'hex'
        );
        sendPacket(socket, 0x015e, messageBuffer, socket.id);
    }

    sendUserList(socket, room) {
        const buffers = [];
        const delimiter = Buffer.from([0xC8]);

        room.getVisibleUsers().forEach(user => {
            const userString = `group_id=${room.id}\nuid=${user.uid}\nnickname=${user.nickname}\nadmin=${user.isAdmin() ? 1 : 0}\ncolor=${user.color}\nmic=${user.mic}\npub=${user.pub}\naway=${user.away}`;
            buffers.push(Buffer.from(userString));
            buffers.push(delimiter);
        });

        buffers.push(Buffer.from('eof=1'));
        const userListBuffer = Buffer.concat(buffers);
        
        sendPacket(socket, 0x0154, userListBuffer, socket.id);
    }

    broadcastUserListUpdate(room) {
        room.getAllUsers().forEach(user => {
            if (user.socket) {
                this.sendUserList(user.socket, room);
            }
        });
    }

    broadcastToRoom(room, packetType, payload, excludeSocket = null) {
        room.getAllUsers().forEach(user => {
            if (user.socket && user.socket !== excludeSocket) {
                sendPacket(user.socket, packetType, payload, user.socket.id);
            }
        });
    }

    broadcastStatusChange(user, mode) {
        const statusBuffer = Buffer.from(
            Utils.decToHex(user.uid) + (mode === USER_MODES.OFFLINE ? '00000000' : '0000001E'),
            'hex'
        );

        serverState.getOnlineUsers().forEach(onlineUser => {
            if (onlineUser.hasBuddy(user.uid) && onlineUser.socket) {
                sendPacket(onlineUser.socket, PACKET_TYPES.STATUS_CHANGE, statusBuffer, onlineUser.socket.id);
            }
        });
    }

    broadcastGlobalAlert(message) {
        const alertBuffer = Buffer.from(message, 'utf8');
        serverState.getOnlineUsers().forEach(user => {
            if (user.socket) {
                sendPacket(user.socket, PACKET_TYPES.ANNOUNCEMENT, alertBuffer, user.socket.id);
            }
        });
    }

    sendBuddyStatusUpdates(socket, user) {
        user.buddies.forEach(buddy => {
            const buddyUser = serverState.getUser(buddy.uid);
            if (buddyUser && buddyUser.isOnline()) {
                const statusBuffer = Buffer.from(Utils.decToHex(buddy.uid) + '0000001E', 'hex');
                sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, statusBuffer, socket.id);
            }
        });
    }

    async sendOfflineMessages(socket, user) {
        const messages = serverState.getOfflineMessages(user.uid);
        
        for (const message of messages) {
            const messageBuffer = Buffer.concat([
                Buffer.from(Utils.decToHex(message.sender), 'hex'),
                Buffer.from(message.content, 'utf8')
            ]);
            
            sendPacket(socket, PACKET_TYPES.IM_IN, messageBuffer, socket.id);
        }

        if (messages.length > 0) {
            serverState.clearOfflineMessages(user.uid);
            logger.info('Offline messages delivered', {
                userId: user.uid,
                messageCount: messages.length
            });
        }
    }
}

module.exports = PacketProcessor;
