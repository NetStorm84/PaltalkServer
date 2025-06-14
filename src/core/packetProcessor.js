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
const { USER_MODES, ROOM_TYPES, SERVER_CONFIG } = require('../config/constants');
const AdminCommandSystem = require('./adminCommandSystem');

class PacketProcessor {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.isShuttingDown = false;
        this.setupEventListeners();
        
        // Initialize admin command system
        this.adminCommands = new AdminCommandSystem(serverState, this);
        
        // Message history for spam detection (in memory)
        this.recentMessages = new Map(); // userId -> [{message, timestamp}, ...]
        this.messageHistoryLimit = 10;
        this.spamCheckWindow = 60000; // 1 minute
        
        // Clean up old message history periodically
        this.cleanupInterval = setInterval(() => {
            this.cleanupMessageHistory();
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    setupEventListeners() {
        // Listen for server state events to handle status broadcasts
        this.userConnectedHandler = (user) => {
            if (!this.isShuttingDown) {
                this.broadcastStatusChange(user, USER_MODES.ONLINE);
            }
        };

        this.userDisconnectedHandler = (user) => {
            if (!this.isShuttingDown) {
                this.broadcastStatusChange(user, USER_MODES.OFFLINE);
            }
        };

        serverState.on('userConnected', this.userConnectedHandler);
        serverState.on('userDisconnected', this.userDisconnectedHandler);
    }

    /**
     * Clean up resources and event listeners
     */
    shutdown() {
        this.isShuttingDown = true;
        
        // Clear intervals
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        // Remove event listeners
        serverState.removeListener('userConnected', this.userConnectedHandler);
        serverState.removeListener('userDisconnected', this.userDisconnectedHandler);
        
        // Clear message history
        this.recentMessages.clear();
    }

    /**
     * Process incoming packet
     * @param {Socket} socket 
     * @param {number} packetType 
     * @param {Buffer} payload 
     */
    async processPacket(socket, packetType, payload) {
        try {
            // Rate limiting per socket
            const socketId = socket.id || 'unknown';
            if (!Utils.checkRateLimit(`socket_${socketId}`, 30, 1000)) { // 30 requests per second
                logger.warn('Rate limit exceeded', { socketId, packetType });
                return;
            }
            
            serverState.updateStats('totalPacketsReceived');
            
            logger.logPacketReceived(packetType, payload, socketId);

            // Update user activity if user is authenticated
            const user = serverState.getUserBySocketId(socketId);
            if (user) {
                user.updateActivity();
            }

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
                
                case PACKET_TYPES.VERSIONS:
                    await this.handleVersions(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_JOIN_AS_ADMIN:
                    await this.handleRoomJoinAsAdmin(socket, payload);
                    break;
                
                case PACKET_TYPES.PACKET_ROOM_ADMIN_INFO:
                    await this.handleRoomAdminInfo(socket, payload);
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

            // WORKING LOGIN SEQUENCE - Testing minimal USER_DATA packet
            
            // Step 1: Basic login response
            const loginResponse = Buffer.alloc(8);
            loginResponse.writeUInt32BE(user.uid, 0);
            loginResponse.writeUInt32BE(1, 4); // Success flag
            sendPacket(socket, PACKET_TYPES.LOGIN, loginResponse, socket.id);

            // Step 2: Send USER_DATA packet with complete field set including SMTP
            // CRITICAL: This complete USER_DATA packet is essential for proper client functionality.
            // All fields must be present in correct order for the client to recognize account status,
            // enable premium features, and maintain stable connections. Key fields include:
            // - paid1: Account type (6=paid, N=free) - determines premium features availability
            // - smtp: Required authentication data for client protocol validation
            // - admin: Admin privileges level for room management capabilities
            // - All AOL/server fields: Required for legacy protocol compatibility
            // - ei/target fields: Essential for user identification and search functionality
            // Removing or modifying this structure may cause client disconnections or feature loss.
            const fullUserData = `uid=${user.uid}\nnickname=${user.nickname}\npaid1=${user.paid1}\nbanners=${user.banners}\nrandom=${user.random}\nsmtp=33802760272033402040337033003400278033003370356021203410364036103110290022503180356037302770374030803600291029603310\nadmin=${user.admin}\nph=0\nget_offers_from_us=0\nget_offers_from_affiliates=0\nfirst=${user.firstName}\nlast=${user.lastName}\nemail=${user.email}\nprivacy=A\nverified=G\ninsta=6\npub=200\nvad=4\ntarget=${user.uid},${user.nickname}&age:0&gender:-\naol=toc.oscar.aol.com:5190\naolh=login.oscar.aol.com:29999\naolr=TIC:\\$Revision: 1.97\\$\naoll=english\ngja=3-15\nei=150498470819571187610865342234417958468385669749\ndemoif=10\nip=81.12.51.219\nsson=Y\ndpp=N\nvq=21\nka=YY\nsr=C\nask=Y;askpbar.dll;{F4D76F01-7896-458a-890F-E1F05C46069F}\ncr=DE\nrel=beta:301,302`;
            
            logger.debug('Sending USER_DATA packet', {
                userId: user.uid,
                nickname: user.nickname,
                paid1: user.paid1,
                dataLength: fullUserData.length
            });
            
            sendPacket(socket, PACKET_TYPES.USER_DATA, Buffer.from(fullUserData), socket.id);
            
            // Step 3: Send buddy list (essential for buddy list window)
            const buddyList = this.createBuddyListBuffer(user);
            sendPacket(socket, PACKET_TYPES.BUDDY_LIST, buddyList, socket.id);

            // Step 4: Send buddy status updates
            this.sendBuddyStatusUpdates(socket, user);

            // Step 5: Login unknown packet (required for buddy list window)
            sendPacket(socket, PACKET_TYPES.LOGIN_UNKNOWN, Buffer.alloc(0), socket.id);

            // Step 6: Send categories
            const categoryBuffer = await this.createCategoryBuffer();
            sendPacket(socket, PACKET_TYPES.CATEGORY_LIST, categoryBuffer, socket.id);

            // Step 7: Send offline messages
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
        
        // Determine admin status for regular room join:
        // - Global admins get admin privileges in ALL rooms automatically
        // - Room owners get admin privileges in their own rooms
        // - Regular users join as normal users (can still use "Join as Admin" separately)
        const isAdmin = user.isAdmin() || (room.createdBy === user.uid);

        if (room.addUser(user, !isInvisible, isAdmin)) {
            await this.sendRoomJoinData(socket, room, user, isAdmin);
            this.broadcastUserListUpdate(room);
        }
    }

    async handleRoomLeave(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const room = serverState.getRoom(roomId);
        
        // Check if user is actually in this room
        if (room && user.isInRoom(roomId) && room.removeUser(user)) {
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
        room.setServerState(serverState);
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
        const rawMessage = payload.slice(4).toString('utf8');

        if (!room || !room.hasUser(user.uid)) return;

        // Enhanced message validation and sanitization
        const sanitizedMessage = Utils.sanitizeChatMessage(rawMessage, 1000);
        if (!sanitizedMessage) {
            logger.warn('Invalid or empty room message', { userId: user.uid, roomId });
            return;
        }

        // Check for spam (simple duplicate message check)
        if (this.isSpamMessage(user.uid, sanitizedMessage)) {
            logger.warn('Spam message detected', { userId: user.uid, roomId, message: sanitizedMessage.substring(0, 50) });
            return;
        }

        // Store recent message for spam detection
        this.storeRecentMessage(user.uid, sanitizedMessage);

        // Broadcast message to all users in room except sender
        const messageBuffer = Buffer.from(
            Utils.decToHex(roomId) + Utils.decToHex(user.uid) + Buffer.from(sanitizedMessage, 'utf8').toString('hex'),
            'hex'
        );

        this.broadcastToRoom(room, PACKET_TYPES.ROOM_MESSAGE_IN, messageBuffer, user.socket);

        // Log the message for moderation
        logger.info('Room message', {
            userId: user.uid,
            nickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            message: sanitizedMessage.substring(0, 100) // Truncate for logs
        });

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
            const response = this.adminCommands.processCommand(user, content.toString('utf8'));
            this.sendSystemMessage(socket, response);
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
            // Store offline message in database for persistence
            try {
                await this.db.storeOfflineMessage(user.uid, receiverUid, content.toString('utf8'));
                logger.info('Offline message stored in database', {
                    senderUid: user.uid,
                    receiverUid,
                    contentLength: content.toString('utf8').length
                });
            } catch (error) {
                logger.error('Failed to store offline message', error, {
                    senderUid: user.uid,
                    receiverUid
                });
            }
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
        this.broadcastStatusChange(socket, newMode);
    }

    async handleMicRequest(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const room = serverState.getRoom(roomId);
        
        if (!room || !room.hasUser(user.uid)) {
            logger.warn('Mic request for room user is not in', { 
                userId: user.uid, 
                roomId 
            });
            return;
        }

        logger.debug('Mic request received', {
            userId: user.uid,
            nickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            isVoiceRoom: room.isVoice,
            userAdmin: user.isAdmin(),
            roomMicEnabled: room.micEnabled
        });

        // Check if this is a voice room
        if (!room.isVoice) {
            logger.warn('Mic request for non-voice room', { 
                userId: user.uid, 
                roomId: room.id,
                roomName: room.name 
            });
            // Send denial response for text rooms
            sendPacket(socket, 0x018d, Buffer.from('00000000', 'hex'), socket.id);
            return;
        }

        // Check if room has mic enabled
        if (!room.micEnabled) {
            logger.warn('Mic request for room with mic disabled', { 
                userId: user.uid, 
                roomId: room.id 
            });
            sendPacket(socket, 0x018d, Buffer.from('00000000', 'hex'), socket.id);
            return;
        }

        // Check user permissions - admins and room owners can always use mic
        const roomUser = room.getUser(user.uid);
        const isRoomAdmin = roomUser && roomUser.isRoomAdmin;
        const isGlobalAdmin = user.isAdmin();
        const isRoomOwner = room.createdBy === user.uid;
        const canUseMic = isGlobalAdmin || isRoomAdmin || isRoomOwner || room.allowAllMics;

        if (!canUseMic) {
            logger.info('Mic request denied - insufficient permissions', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                isRoomAdmin,
                isGlobalAdmin,
                isRoomOwner,
                allowAllMics: room.allowAllMics
            });
            sendPacket(socket, 0x018d, Buffer.from('00000000', 'hex'), socket.id);
            return;
        }

        // Grant mic permission
        logger.info('Mic permission granted', {
            userId: user.uid,
            nickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            permissionReason: isGlobalAdmin ? 'global_admin' : 
                             isRoomAdmin ? 'room_admin' : 
                             isRoomOwner ? 'room_owner' : 'room_allows_all'
        });

        // Update user mic status
        if (roomUser) {
            roomUser.mic = 1;
        }
        user.mic = 1;

        // Send mic granted response with room ID
        const roomIdBuffer = payload.slice(0, 4);
        sendPacket(socket, 0x018d, roomIdBuffer, socket.id);

        // Broadcast updated user list to show mic status change
        this.broadcastUserListUpdate(room);

        // Log for voice server coordination
        logger.debug('User granted mic permission', {
            userId: user.uid,
            roomId: room.id,
            voiceServerPort: SERVER_CONFIG?.VOICE_PORT || 2090
        });
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

    async handleVersions(socket, payload) {
        // Handle version check - respond with server version info
        const versionResponse = Buffer.from('version=1.0.0\nprotocol=2024');
        sendPacket(socket, PACKET_TYPES.VERSIONS, versionResponse, socket.id);
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

    /**
     * Send system message to user
     * @param {Socket} socket 
     * @param {string} message 
     */
    sendSystemMessage(socket, message) {
        const responseBuffer = Buffer.concat([
            Buffer.from('000f4241', 'hex'), // System identifier
            Buffer.from(message, 'utf8')
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
            // l=1 means locked (password required), l=0 means not locked
            const isLocked = room.password ? 1 : 0;
            const roomString = `id=${room.id}\nnm=${room.name}\n#=${room.getUserCount()}\nv=${room.isVoice}\nl=${isLocked}\nr=${room.rating}\np=${room.isPrivate}\nc=000000000`;
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

        logger.debug('Room join data preparation', {
            roomId: room.id,
            roomName: room.name,
            isVoice: room.isVoice,
            isAdmin,
            roomType,
            userId: user.uid,
            nickname: user.nickname
        });

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

        logger.info('Room join data sent successfully', {
            roomId: room.id,
            roomName: room.name,
            userId: user.uid,
            nickname: user.nickname,
            isAdmin,
            isVoice: room.isVoice
        });
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

        const visibleUsers = room.getVisibleUsers();
        logger.debug('Sending user list', {
            roomId: room.id,
            userCount: visibleUsers.length,
            users: visibleUsers.map(u => ({ uid: u.uid, nickname: u.nickname, admin: u.admin, isRoomAdmin: u.isRoomAdmin }))
        });

        visibleUsers.forEach(user => {
            const userString = `group_id=${room.id}\nuid=${user.uid}\nnickname=${user.nickname}\nadmin=${user.admin}\ncolor=${user.color}\nmic=${user.mic}\npub=${user.pub}\naway=${user.away}`;
            buffers.push(Buffer.from(userString));
            buffers.push(delimiter);
        });

        buffers.push(Buffer.from('eof=1'));
        const userListBuffer = Buffer.concat(buffers);
        
        sendPacket(socket, 0x0154, userListBuffer, socket.id);
    }

    broadcastUserListUpdate(room) {
        room.getAllUsers().forEach(roomUserData => {
            const user = serverState.getUser(roomUserData.uid);
            if (user && user.socket) {
                this.sendUserList(user.socket, room);
            }
        });
    }

    broadcastToRoom(room, packetType, payload, excludeSocket = null) {
        room.getAllUsers().forEach(roomUserData => {
            const user = serverState.getUser(roomUserData.uid);
            if (user && user.socket && user.socket !== excludeSocket) {
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
        try {
            // Get offline messages from database
            const messages = await this.db.getOfflineMessages(user.uid);
            
            if (messages.length === 0) {
                logger.debug('No offline messages for user', { userId: user.uid });
                return;
            }

            // Send each message
            const messageIds = [];
            for (const message of messages) {
                try {
                    const messageBuffer = Buffer.concat([
                        Buffer.from(Utils.decToHex(message.sender), 'hex'),
                        Buffer.from(message.content, 'utf8')
                    ]);
                    
                    sendPacket(socket, PACKET_TYPES.IM_IN, messageBuffer, socket.id);
                    messageIds.push(message.id);
                    
                    logger.debug('Offline message sent', {
                        messageId: message.id,
                        senderId: message.sender,
                        receiverId: user.uid,
                        contentLength: message.content.length
                    });
                } catch (sendError) {
                    logger.error('Failed to send offline message', sendError, {
                        messageId: message.id,
                        userId: user.uid
                    });
                }
            }

            // Mark messages as sent in database
            if (messageIds.length > 0) {
                try {
                    await this.db.markMessagesAsSent(messageIds);
                    logger.info('Offline messages delivered and marked as sent', {
                        userId: user.uid,
                        messageCount: messageIds.length,
                        messageIds
                    });
                } catch (markError) {
                    logger.error('Failed to mark messages as sent', markError, {
                        userId: user.uid,
                        messageIds
                    });
                }
            }
        } catch (error) {
            logger.error('Failed to retrieve offline messages', error, {
                userId: user.uid
            });
        }
    }

    // Spam detection helpers
    
    /**
     * Check if a message is spam based on recent history
     * @param {number} userId 
     * @param {string} message 
     * @returns {boolean}
     */
    isSpamMessage(userId, message) {
        const userMessages = this.recentMessages.get(userId) || [];
        const now = Date.now();
        const recentWindow = now - this.spamCheckWindow;
        
        // Filter messages within the window
        const recentCount = userMessages.filter(msg => msg.timestamp > recentWindow).length;
        
        // Check for too many messages
        if (recentCount >= 5) return true;
        
        // Check for duplicate messages
        const duplicateCount = userMessages.filter(msg => 
            msg.message === message && msg.timestamp > recentWindow
        ).length;
        
        return duplicateCount >= 2;
    }

    /**
     * Store recent message for spam detection
     * @param {number} userId 
     * @param {string} message 
     */
    storeRecentMessage(userId, message) {
        if (!this.recentMessages.has(userId)) {
            this.recentMessages.set(userId, []);
        }
        
        const userMessages = this.recentMessages.get(userId);
        userMessages.push({
            message,
            timestamp: Date.now()
        });
        
        // Keep only recent messages
        if (userMessages.length > this.messageHistoryLimit) {
            userMessages.shift();
        }
    }

    /**
     * Handle admin room join packet
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleRoomJoinAsAdmin(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        // Extract the basic payload components
        const userBytes = payload.slice(0, 4);  // Target user UID
        const password = payload.slice(4, 8);   // Password (ignored for now)
        const port = payload.slice(8, 12);      // Voice port (ignored)

        // Extract target UID from the first 4 bytes
        const targetUid = Utils.hexToDec(userBytes);

        logger.debug('Admin room join request', {
            userId: user.uid,
            nickname: user.nickname,
            payloadHex: payload.toString('hex'),
            payloadLength: payload.length,
            adminLevel: user.admin,
            userBytes: userBytes.toString('hex'),
            targetUid: targetUid,
            password: password.toString('hex'),
            port: port.toString('hex')
        });

        // Only regular users (admin=0) should use this route
        // Global admins (admin=1) should use the regular room join process instead
        if (user.admin === 1) {
            logger.warn('Global admin attempted to use admin room join route', {
                userId: user.uid,
                nickname: user.nickname,
                adminLevel: user.admin
            });
            return;
        }

        if (!targetUid) {
            logger.warn('Invalid target UID for admin room join', {
                userId: user.uid,
                userBytes: userBytes.toString('hex')
            });
            return;
        }

        logger.debug('Looking for room owned by target UID', {
            requestingUserId: user.uid,
            requestingUserNickname: user.nickname,
            targetUid: targetUid
        });

        // Find the user by UID
        const targetUser = await this.db.getUserByUid(targetUid);
        if (!targetUser) {
            logger.warn('Target user not found for admin room join', {
                requestingUserId: user.uid,
                targetUid: targetUid
            });
            return;
        }

        // Find a room owned by this user
        const targetRoom = serverState.getAllRooms().find(room => room.createdBy === targetUser.uid);
        
        if (!targetRoom) {
            logger.warn('Target user does not own any rooms', {
                requestingUserId: user.uid,
                targetUid: targetUid,
                targetUserId: targetUser.uid,
                targetNickname: targetUser.nickname
            });
            return;
        }

        logger.info('Found target room for admin join', {
            requestingUserId: user.uid,
            requestingUserNickname: user.nickname,
            targetUid: targetUid,
            targetNickname: targetUser.nickname,
            roomId: targetRoom.id,
            roomName: targetRoom.name
        });

        // For multiple room support, users can join additional rooms as admin
        // without leaving their current rooms (unless they choose to)

        // Join the target room as admin (4th parameter = true, like original joinRoom call)
        if (targetRoom.addUser(user, true, true)) { // visible=true, isAdmin=true
            await this.sendRoomJoinData(socket, targetRoom, user, true);
            this.broadcastUserListUpdate(targetRoom);
            
            logger.info('User successfully joined room as admin', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: targetRoom.id,
                roomName: targetRoom.name,
                adminType: 'room_owner_admin'
            });
        } else {
            logger.warn('Failed to add user to room as admin', {
                userId: user.uid,
                roomId: targetRoom.id
            });
        }
    }

    /**
     * Handle room admin info request
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleRoomAdminInfo(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        logger.debug('Room admin info request', {
            userId: user.uid,
            nickname: user.nickname,
            payloadHex: payload.toString('hex'),
            payloadLength: payload.length
        });

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const room = serverState.getRoom(roomId);

        if (!room) {
            logger.warn('Admin info requested for non-existent room', { 
                roomId, 
                userId: user.uid 
            });
            return;
        }

        // Check if user has admin privileges in this room (room admin OR global admin OR room owner)
        const userInRoom = room.getUser(user.uid);
        const isRoomAdmin = userInRoom && userInRoom.isRoomAdmin;
        const isGlobalAdmin = user.isAdmin();
        const isRoomOwner = room.createdBy === user.uid;
        
        logger.debug('Admin privileges check', {
            userId: user.uid,
            roomId: room.id,
            isRoomAdmin,
            isGlobalAdmin,
            isRoomOwner,
            userInRoom: !!userInRoom
        });
        
        if (!isRoomAdmin && !isGlobalAdmin && !isRoomOwner) {
            logger.warn('User without admin privileges requested room admin info', {
                userId: user.uid,
                roomId: room.id,
                isRoomAdmin,
                isGlobalAdmin,
                isRoomOwner
            });
            return;
        }

        // Send room admin info response - this tells the client what admin controls are available
        const roomIdHex = payload.slice(0, 4).toString('hex');
        const adminInfo = `group=${roomIdHex}\nmike=${room.micEnabled}\ntext=${room.textEnabled}\n`;
        
        logger.debug('Sending room admin info', {
            userId: user.uid,
            roomId: room.id,
            adminInfo,
            packetType: PACKET_TYPES.PACKET_ROOM_ADMIN_INFO
        });
        
        sendPacket(socket, PACKET_TYPES.PACKET_ROOM_ADMIN_INFO, Buffer.from(adminInfo, 'utf8'), socket.id);

        logger.info('Room admin info sent successfully', {
            userId: user.uid,
            roomId: room.id,
            micEnabled: room.micEnabled,
            textEnabled: room.textEnabled,
            adminType: isGlobalAdmin ? 'global_admin' : isRoomOwner ? 'room_owner' : 'room_admin'
        });
    }

    /**
     * Clean up old message history
     */
    cleanupMessageHistory() {
        const cutoff = Date.now() - this.spamCheckWindow;
        
        for (const [userId, messages] of this.recentMessages) {
            const filtered = messages.filter(msg => msg.timestamp > cutoff);
            
            if (filtered.length === 0) {
                this.recentMessages.delete(userId);
            } else {
                this.recentMessages.set(userId, filtered);
            }
        }
    }
}

module.exports = PacketProcessor;
