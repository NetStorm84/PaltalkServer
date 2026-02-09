/**
 * Improved packet processor with better organization and error handling
 */
const { PACKET_TYPES } = require('../../PacketHeaders');
const { sendPacket } = require('../network/packetSender');
const serverState = require('./serverState');
const User = require('../models/User');
const Room = require('../models/Room');
const Utils = require('../utils/utils');
const logger = require('../utils/logger');
const { USER_MODES, ROOM_TYPES, SERVER_CONFIG } = require('../config/constants');
const AdminCommandSystem = require('./adminCommandSystem');

// Room type codes discovered through testing
const ROOM_TYPE_CODES = {
    TEXT_NORMAL: '00000000',              // Normal text chat
    TEXT_ADMIN: '00000001',               // Text chat as admin
    TEXT_MODERATOR: '00000100',           // Text chat (Administrator)
    PRIVATE_TEXT: '00050000',             // Private text chat
    
    VOICE_NORMAL: '00030000',             // Voice Conference (non-admin)
    VOICE_ADMIN: '00030001',              // Voice Conference as admin
    PRIVATE_VOICE: '00010000',            // Private Voice Conference
    GROUP_VOICE: '00020000',              // Group with voice
    
    // Additional discovered types
    VIDEO_CONFERENCE: '00040000',         // Video Conference
    PRIVATE_VIDEO: '00060000',            // Private Video Conference
    
    // Discovered room types with their client display names
    DISCOVERED: {
        '00000000': 'Text Chat',
        '00000001': 'Text Chat (Admin)',
        '00000100': '(Administrator)',
        '00010000': 'Private Voice Conference',
        '00020000': 'Group',
        '00030000': 'Voice Conference',
        '00030001': 'Voice Conference (Admin)',
        '00040000': 'Video Conference',
        '00050000': 'Private Text',
        '00060000': 'Private Video Conference'
    }
};

class PacketProcessor {
    constructor(databaseManager, mediaServer = null) {
        this.db = databaseManager;
        this.mediaServer = mediaServer;
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
        this.userConnectedHandler = (data) => {
            if (!this.isShuttingDown && data.user) {
                logger.debug('User connected event received', {
                    userId: data.user.uid,
                    nickname: data.user.nickname
                });
                this.broadcastStatusChange(data.user, USER_MODES.ONLINE);
            }
        };

        this.userDisconnectedHandler = (data) => {
            if (!this.isShuttingDown && data.user) {
                logger.debug('User disconnected event received', {
                    userId: data.user.uid,
                    nickname: data.user.nickname,
                    reason: data.reason
                });
                this.broadcastStatusChange(data.user, USER_MODES.OFFLINE);
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
            
            // Get user info for packet logging
            const user = serverState.getUserBySocketId(socketId);
            const clientInfo = user ? {
                nickname: user.nickname || 'Unknown',
                name: (user.firstName || '') + ' ' + (user.lastName || ''),
                userId: user.uid,
                isAuthenticated: true,
                ipAddress: socket.remoteAddress || 'Unknown'
            } : {
                nickname: 'Unauthenticated',
                name: 'Unknown User',
                userId: null,
                isAuthenticated: false,
                ipAddress: socket.remoteAddress || 'Unknown'
            };
            
            logger.logPacketReceived(packetType, payload, socketId, clientInfo);

            // Debug logging for keep-alive packets only
            if (packetType === -160) {
                logger.debug('📦 KEEPALIVE PACKET', {
                    packetType,
                    userId: user?.uid,
                    nickname: user?.nickname,
                    socketId: socket.id,
                    timestamp: new Date().toISOString()
                });
            }

            // Debug logging for GET_ADMIN_INFO packet
            if (packetType === PACKET_TYPES.PACKET_ROOM_GET_ADMIN_INFO) {
                logger.info('🔧 GET_ADMIN_INFO packet received!', {
                    packetType,
                    packetHex: `0x${packetType.toString(16)}`,
                    userId: user?.uid,
                    nickname: user?.nickname,
                    payloadLength: payload.length,
                    payloadHex: payload.toString('hex')
                });
            }

            // Update user activity if user is authenticated
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
                
                case PACKET_TYPES.GET_UIN:
                    await this.handleGetUin(socket, payload);
                    break;
                
                case PACKET_TYPES.LOGIN:
                    await this.handleLogin(socket, payload);
                    break;
                
                case PACKET_TYPES.LOGOUT:
                    await this.handleLogout(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_JOIN:
                    await this.handleRoomJoin(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_JOIN_REQUEST:
                    await this.handleRoomJoinRequest(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_LEAVE:
                    await this.handleRoomLeave(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_CLOSE:
                    await this.handleRoomClose(socket, payload);
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
                
                case PACKET_TYPES.REMOVE_PAL:
                    await this.handleRemoveBuddy(socket, payload);
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
                    logger.info('🎤 REQ_MIC packet received!', { 
                        socketId: socket.id, 
                        payloadHex: payload.toString('hex') 
                    });
                    await this.handleMicRequest(socket, payload);
                    break;
                
                case PACKET_TYPES.UNREQ_MIC:
                    logger.info('🎤 UNREQ_MIC packet received!', { 
                        socketId: socket.id, 
                        payloadHex: payload.toString('hex') 
                    });
                    await this.handleMicUnrequest(socket, payload);
                    break;
                
                case PACKET_TYPES.PACKET_ROOM_RED_DOT_USER:
                    logger.info('🔴 RED_DOT_USER packet received!', { 
                        socketId: socket.id, 
                        payloadHex: payload.toString('hex') 
                    });
                    await this.handleRedDotUser(socket, payload);
                    break;
                
                case PACKET_TYPES.PACKET_ROOM_UNRED_DOT_USER:
                    logger.info('🔴 UNRED_DOT_USER packet received!', { 
                        socketId: socket.id, 
                        payloadHex: payload.toString('hex') 
                    });
                    await this.handleUnredDotUser(socket, payload);
                    break;
                
                case PACKET_TYPES.PACKET_ROOM_RED_DOT_TEXT:
                    logger.info('🔴 RED_DOT_TEXT packet received!', { 
                        socketId: socket.id, 
                        payloadHex: payload.toString('hex') 
                    });
                    await this.handleRedDotTextToggle(socket, payload);
                    break;
                
                case PACKET_TYPES.PACKET_ROOM_RED_DOT_VIDEO:
                    logger.info('🔴 RED_DOT_VIDEO packet received!', { 
                        socketId: socket.id, 
                        payloadHex: payload.toString('hex') 
                    });
                    await this.handleRedDotVideoToggle(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_BANNER_MESSAGE:
                    await this.handleRoomBanner(socket, payload);
                    break;
                
                case PACKET_TYPES.VERSIONS:
                    await this.handleVersions(socket, payload);
                    break;

                // Paltalk 8 specific packets
                case PACKET_TYPES.PALTALK8_INIT:
                    // Acknowledge initialization data - no response needed
                    logger.info('Paltalk 8 INIT received', { socketId: socket.id });
                    break;

                case PACKET_TYPES.PALTALK8_STATUS:
                    // Status/heartbeat - no response needed
                    logger.debug('Paltalk 8 STATUS received', { socketId: socket.id });
                    break;

                case PACKET_TYPES.PALTALK8_GUID:
                    // Client GUID registration - acknowledge
                    logger.info('Paltalk 8 GUID received', {
                        socketId: socket.id,
                        guid: payload.toString('ascii')
                    });
                    break;

                case PACKET_TYPES.PALTALK8_READY:
                    // Client ready signal - no response needed
                    logger.info('Paltalk 8 READY received', { socketId: socket.id });
                    break;

                case PACKET_TYPES.PALTALK8_SYNC:
                    // Sync request - no response needed
                    logger.info('Paltalk 8 SYNC received', { socketId: socket.id });
                    break;

                case PACKET_TYPES.KEEP_ALIVE:
                    // Handle packet type 13 (0x000D) - keep-alive or status packet
                    logger.info('Received KEEP_ALIVE packet', { 
                        socketId: socket.id,
                        connectionId: socket.connectionId,
                        hasServer: !!socket.server,
                        hasUpdateMethod: !!(socket.server && socket.server.updateConnectionMetrics),
                        payloadHex: payload.toString('hex')
                    });
                    
                    // Update connection metrics to prevent timeout
                    if (socket.server && socket.server.updateConnectionMetrics) {
                        socket.server.updateConnectionMetrics(socket.connectionId, 'keepalive', 0);
                        logger.info('Updated connection metrics for KEEP_ALIVE', {
                            connectionId: socket.connectionId
                        });
                    } else {
                        logger.warn('Cannot update connection metrics for KEEP_ALIVE - missing server reference', {
                            socketId: socket.id,
                            connectionId: socket.connectionId,
                            hasServer: !!socket.server
                        });
                    }
                    
                    // Just acknowledge - no response needed
                    break;
                
                case PACKET_TYPES.ROOM_JOIN_AS_ADMIN:
                    await this.handleRoomJoinAsAdmin(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_START_PUBLISH_VIDEO:
                    await this.handleRoomStartPublishVideo(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_STOP_PUBLISH_VIDEO:
                    await this.handleRoomStopPublishVideo(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_BOUNCE_USER:
                    await this.handleRoomBounceUser(socket, payload);
                    break;
                
                case PACKET_TYPES.ROOM_BOUNCE_REASON:
                    await this.handleRoomBounceReason(socket, payload);
                    break;
                
                case PACKET_TYPES.PACKET_ROOM_GET_ADMIN_INFO:
                    await this.handleRoomGetAdminInfo(socket, payload);
                    break;
                
                case PACKET_TYPES.PACKET_ROOM_ADMIN_INFO:
                    await this.handleRoomAdminInfo(socket, payload);
                    break;
                
                case PACKET_TYPES.INVITE_OUT:
                    await this.handleInviteOut(socket, payload);
                    break;
                
                case PACKET_TYPES.ECHO:
                    await this.handleEcho(socket, payload);
                    break;

                // Handle unknown packet types that might be causing reconnections
                case -2121:
                    logger.debug('Received packet -2121 (unknown client packet)', { 
                        socketId: socket.id,
                        payloadHex: payload.toString('hex')
                    });
                    // Send generic OK response to prevent client reconnection
                    break;
                    
                case -2100:
                    logger.debug('Received packet -2100 (unknown client packet)', { 
                        socketId: socket.id,
                        payloadHex: payload.toString('hex')
                    });
                    // Send generic OK response to prevent client reconnection
                    break;
                    
                case -160:
                    logger.info('✅ KEEPALIVE: Received packet -160 (keepalive)', { 
                        socketId: socket.id,
                        connectionId: socket.connectionId,
                        payloadHex: payload.toString('hex')
                    });
                    // This is a keepalive packet sent every minute by the client
                    // Explicitly update connection metrics to prevent timeout
                    if (socket.server && socket.server.updateConnectionMetrics) {
                        socket.server.updateConnectionMetrics(socket.connectionId, 'keepalive', 0);
                        logger.debug('Updated connection metrics for keepalive packet -160', {
                            connectionId: socket.connectionId
                        });
                    }
                    break;
                    
                case -3000:
                    logger.debug('Received packet -3000 (unknown client packet)', { 
                        socketId: socket.id,
                        payloadHex: payload.toString('hex')
                    });
                    // Handle -3000 packet (likely disconnect preparation)
                    break;
                    
                case -1100:
                    logger.debug('Received packet -1100 (unknown client packet)', { 
                        socketId: socket.id,
                        payloadHex: payload.toString('hex')
                    });
                    // Handle -1100 packet (likely final disconnect)
                    break;
                
                case PACKET_TYPES.USER_PROFILE_UPDATE:
                    await this.handleUserProfileUpdate(socket, payload);
                    break;

                case PACKET_TYPES.REQUEST_STATUS:
                    await this.handleRequestStatus(socket, payload);
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
        // Detect client version from packet header version (set in server.js)
        // Paltalk 5 uses version 29, Paltalk 8 uses version 86
        const isPaltalk8 = socket.clientVersion === 86 || socket.clientVersion === 14;
        const clientVersion = isPaltalk8 ? 'Paltalk8' : 'Paltalk5';

        // Check for "BB" marker - must have 0x000f at bytes 0-1 AND 0x4242 at bytes 2-3
        // This distinguishes from UID 1000002 (0x000F4242) which has the same byte pattern
        // Real BB marker: 000f4242 followed by 00000001...
        // UID packet: just the UID followed by different data
        const hasBBMarker = payload.length >= 8 &&
            payload.slice(0, 2).toString('hex') === '000f' &&
            payload.slice(2, 4).toString('hex') === '4242' &&
            payload.slice(4, 8).toString('hex') === '00000001';

        logger.info('📝 LYMERICK received', {
            socketId: socket.id,
            clientVersion,
            hasBBMarker,
            packetVersion: socket.clientVersion,
            payloadLength: payload.length,
            payloadHex: payload.toString('hex').substring(0, 100)
        });

        // Paltalk 8 with BB marker: Send UIN_RESPONSE + LOGIN_NOT_COMPLETE
        if (isPaltalk8 && hasBBMarker) {
            // Look up user from database
            let userData = await this.db.getUserByNickname('NetStorm');
            if (!userData) {
                userData = { uid: 1000002, nickname: 'NetStorm' };
            }

            // Map database UID to Paltalk 8 compatible range (avoids BB marker collision)
            const paltalk8Uid = 50000000 + userData.uid;

            const uinResponse = Buffer.from(`uid=${paltalk8Uid}\nnickname=${userData.nickname}\n`);
            logger.info('Sending UIN_RESPONSE for LYMERICK (BB)', {
                paltalk8Uid,
                databaseUid: userData.uid,
                nickname: userData.nickname
            });
            sendPacket(socket, PACKET_TYPES.UIN_RESPONSE, uinResponse, socket.id);

            // Store mapping for login handler
            if (!this.paltalk8PendingUsers) {
                this.paltalk8PendingUsers = new Map();
            }
            this.paltalk8PendingUsers.set(socket.remoteAddress, {
                paltalk8Uid,
                databaseUid: userData.uid,
                nickname: userData.nickname,
                userData
            });

            sendPacket(socket, PACKET_TYPES.LOGIN_NOT_COMPLETE, Buffer.alloc(0), socket.id);
        } else if (isPaltalk8) {
            // Paltalk 8 without BB marker: Extract UID from payload and store on socket
            // First 4 bytes contain the UID in big-endian format
            if (payload.length >= 4) {
                const uid = payload.readUInt32BE(0);
                socket.paltalk8Uid = uid;
                logger.info('Extracted UID from LYMERICK', { uid, socketId: socket.id });

                // Also try to get user data from pending map
                const clientIp = socket.remoteAddress;
                if (this.paltalk8PendingUsers && this.paltalk8PendingUsers.has(clientIp)) {
                    socket.paltalk8UserData = this.paltalk8PendingUsers.get(clientIp);
                    logger.info('Found pending user data for Paltalk 8', {
                        clientIp,
                        uid: socket.paltalk8UserData.uid,
                        nickname: socket.paltalk8UserData.nickname
                    });
                }
            }

            // Send LOGIN_NOT_COMPLETE then SERVER_KEY
            sendPacket(socket, PACKET_TYPES.LOGIN_NOT_COMPLETE, Buffer.alloc(0), socket.id);

            // SERVER_KEY = 10 (519 - 509 = 10)
            socket.serverKey = 10;

            // SERVER_KEY for Paltalk 8 has a 14-byte prefix before the key string
            const prefix = Buffer.from('00030007001302580279024602a6', 'hex');
            const keyString = Buffer.from('519');
            const serverKeyPayload = Buffer.concat([prefix, keyString]);
            logger.info('Sending SERVER_KEY for Paltalk 8', {
                payloadHex: serverKeyPayload.toString('hex'),
                serverKey: socket.serverKey
            });
            sendPacket(socket, PACKET_TYPES.SERVER_KEY, serverKeyPayload, socket.id);
        } else {
            // Paltalk 5: Original flow
            sendPacket(socket, PACKET_TYPES.LOGIN_NOT_COMPLETE, Buffer.alloc(0), socket.id);

            // SERVER_KEY = 10 (519 - 509 = 10)
            socket.serverKey = 10;

            // Use 'latin1' encoding so '¦' is 1 byte (0xA6), not 2 bytes (UTF-8: 0xC2A6)
            // Client reads payload[4:7] for SERVER_KEY, so '519' must start at byte 4
            const serverKey = Buffer.from('XyF\xA6519', 'latin1');
            logger.info('Sending SERVER_KEY for Paltalk 5', {
                serverKey: socket.serverKey,
                payloadHex: serverKey.toString('hex')
            });
            sendPacket(socket, PACKET_TYPES.SERVER_KEY, serverKey, socket.id);
        }
    }

    /**
     * Handle UIN (User ID Number) request - provides a valid UID for login
     * Based on old implementation: payload.slice(4).toString('utf8') contains the nickname
     * Response format: Buffer.from(`uid=${usr.uid}\nnickname=${usr.nickname}\n`)
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleGetUin(socket, payload) {
        logger.info('GET_UIN request received', { 
            socketId: socket.id,
            payloadLength: payload.length,
            payloadHex: payload.toString('hex')
        });
        
        try {
            // OLD IMPLEMENTATION LOGIC: Extract nickname from payload.slice(4).toString('utf8')
            const nickname = payload.slice(4).toString('utf8').trim();
            
            logger.debug('GET_UIN extracting nickname from payload', { 
                socketId: socket.id, 
                nickname: nickname,
                payloadAfterSlice: payload.slice(4).toString('hex')
            });
            
            // Find user by nickname
            const userData = await this.db.getUserByNickname(nickname);
            
            if (userData) {
                // OLD IMPLEMENTATION RESPONSE: Buffer.from(`uid=${usr.uid}\nnickname=${usr.nickname}\n`)
                const responseString = `uid=${userData.uid}\nnickname=${userData.nickname}\n`;
                const response = Buffer.from(responseString);
                
                sendPacket(socket, PACKET_TYPES.UIN_RESPONSE, response, socket.id);
                
                logger.info('UIN_RESPONSE sent for found user', { 
                    socketId: socket.id, 
                    uid: userData.uid,
                    nickname: userData.nickname,
                    responseString: responseString
                });
            } else {
                // User not found - send uid=-1 response
                logger.warn('UIN request for non-existent user', { 
                    socketId: socket.id, 
                    requestedNickname: nickname
                });
                
                const responseString = `uid=-1`;
                const response = Buffer.from(responseString);
                
                sendPacket(socket, PACKET_TYPES.UIN_RESPONSE, response, socket.id);
                
                logger.info('UIN_RESPONSE sent for non-existent user with uid=-1', { 
                    socketId: socket.id, 
                    requestedNickname: nickname,
                    responseString: responseString
                });
            }
            
        } catch (error) {
            logger.error('Failed to process GET_UIN request', error, { socketId: socket.id });
            
            // Send uid=-1 response for errors
            const responseString = `uid=-1`;
            const response = Buffer.from(responseString);
            
            sendPacket(socket, PACKET_TYPES.UIN_RESPONSE, response, socket.id);
            
            logger.info('UIN_RESPONSE sent for error case with uid=-1', { 
                socketId: socket.id, 
                responseString: responseString
            });
        }
    }

    async handleLogin(socket, payload) {
        try {
            // Detect Paltalk 8 by checking for 03651e52 prefix or version 86
            const isPaltalk8 = socket.clientVersion === 86 ||
                              (payload.length >= 4 && payload.slice(0, 4).toString('hex') === '03651e52');

            let uid;
            let userData;

            if (isPaltalk8) {
                // Paltalk 8: Use the UID stored from LYMERICK handler
                if (socket.paltalk8UserData) {
                    // Use the user data we looked up earlier
                    uid = socket.paltalk8UserData.uid;
                    logger.info('Paltalk 8 login detected (using stored user data)', {
                        uid,
                        nickname: socket.paltalk8UserData.nickname
                    });
                    userData = await this.db.getUserByUid(uid);
                } else if (socket.paltalk8Uid) {
                    // Fallback to extracted UID from LYMERICK
                    uid = socket.paltalk8Uid;
                    logger.info('Paltalk 8 login detected (using extracted UID)', { uid });
                    userData = await this.db.getUserByUid(uid);
                } else {
                    // Last resort: extract UID from payload
                    uid = payload.readUInt32BE(0);
                    logger.info('Paltalk 8 login detected (extracting from payload)', { uid });
                    userData = await this.db.getUserByUid(uid);
                }
            } else {
                // Paltalk 5: UID in first 4 bytes
                uid = Utils.hexToDec(payload.slice(0, 4));
                userData = await this.db.getUserByUid(uid);
            }

            // For Paltalk 8, try to get actual database user using mapped UID
            if (!userData && isPaltalk8 && socket.paltalk8UserData) {
                // Use the original database UID to load proper user data
                const databaseUid = socket.paltalk8UserData.databaseUid;
                userData = await this.db.getUserByUid(databaseUid);
                if (userData) {
                    // Override UID with Paltalk 8 mapped UID for this session
                    userData.uid = socket.paltalk8UserData.paltalk8Uid;
                    logger.info('Loaded Paltalk 8 user from database', {
                        paltalk8Uid: userData.uid,
                        databaseUid,
                        nickname: userData.nickname
                    });
                }
            }

            // Fallback: create temporary user if still not found
            if (!userData && isPaltalk8) {
                const nickname = socket.paltalk8UserData?.nickname || 'NetStorm';
                const userUid = socket.paltalk8UserData?.paltalk8Uid || uid;
                logger.info('Creating temporary Paltalk 8 user', { uid: userUid, nickname });
                userData = {
                    uid: userUid,
                    nickname: nickname,
                    email: 'paltalk8@example.com',
                    firstName: nickname,
                    lastName: '',
                    admin: 0,
                    paid1: '6',
                    banners: 0,
                    random: 1
                };
            }

            if (!userData) {
                logger.warn('Login attempt with invalid UID', { uid, socketId: socket.id });
                this.sendLoginFailure(socket, 'Invalid user');
                return;
            }

            // Password verification
            const passwordStartPos = isPaltalk8 ? 4 : 4;
            if (payload.length > passwordStartPos) {
                const encryptedPassword = payload.slice(passwordStartPos).toString('ascii').trim();
                const serverKey = socket.serverKey || 0;
                const decryptedPassword = Utils.decryptPassword(encryptedPassword, serverKey);

                logger.debug('Password verification attempt', {
                    uid,
                    serverKey,
                    decryptedPassword,
                    storedPassword: userData.password,
                    match: decryptedPassword === userData.password
                });

                // Only verify if user has a password set
                if (userData.password && userData.password !== 'system_no_login') {
                    if (decryptedPassword !== userData.password) {
                        logger.warn('Password verification failed', {
                            uid,
                            nickname: userData.nickname,
                            socketId: socket.id
                        });
                        this.sendLoginFailure(socket, 'Invalid password');
                        return;
                    }
                    logger.info('Password verified successfully', { uid, nickname: userData.nickname });
                }
            }

            // CRITICAL FIX: Clean up any existing session for this user BEFORE creating new user object
            // This prevents "User already in room" errors from stale sessions
            const existingUser = serverState.getUser(uid);
            if (existingUser) {
                logger.warn('User attempting to login while already connected - cleaning up existing session', {
                    uid: existingUser.uid,
                    nickname: existingUser.nickname,
                    existingSocketId: existingUser.socket?.id
                });
                
                // Force cleanup of existing session
                serverState.removeUserConnection(existingUser.uid, 'Duplicate login - cleaning up old session');
            }
            
            const user = new User(userData);
            
            // CRITICAL FIX: Set user mode to ONLINE when they successfully log in
            user.setMode(USER_MODES.ONLINE);
            
            // FIXED: Do NOT override socket.id - this breaks socket management and causes session conflicts
            // Keep the original socket.id and let the server state manage the mapping properly
            
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

            // Step 2: Send USER_DATA packet (full data for both Paltalk 5 and 8)
            const fullUserData = `uid=${user.uid}\nnickname=${user.nickname}\npaid1=6\nbanners=${user.banners}\nrandom=${user.random}\nsmtp=33802760272033402040337033003400278033003370356021203410364036103110290022503180356037302770374030803600291029603310\nadmin=${user.admin}\nph=0\nget_offers_from_us=0\nget_offers_from_affiliates=0\nfirst=${user.firstName}\nlast=${user.lastName}\nemail=${user.email}\nprivacy=A\nverified=G\ninsta=6\npub=200\nvad=4\ntarget=${user.uid},${user.nickname}&age:0&gender:-\naol=toc.oscar.aol.com:5190\naolh=login.oscar.aol.com:29999\naolr=TIC:\\$Revision: 1.97\\$\naoll=english\ngja=3-15\nei=150498470819571187610865342234417958468385669749\ndemoif=10\nip=81.12.51.219\nsson=Y\ndpp=N\nvq=21\nka=YY\nsr=C\nask=Y;askpbar.dll;{F4D76F01-7896-458a-890F-E1F05C46069F}\ncr=DE\nrel=beta:301,302`;

            logger.info('Sending USER_DATA packet', {
                userId: user.uid,
                nickname: user.nickname,
                paid1: user.paid1,
                dataLength: fullUserData.length
            });

            sendPacket(socket, PACKET_TYPES.USER_DATA, Buffer.from(fullUserData), socket.id);
            
            // Step 3: Send buddy list (same for both Paltalk 5 and 8)
            const buddyList = this.createBuddyListBuffer(user);
            sendPacket(socket, PACKET_TYPES.BUDDY_LIST, buddyList, socket.id);

            // Step 4: Send individual status updates for each buddy (required for UI to show correct status)
            this.sendBuddyStatusUpdatesOnLogin(socket, user);

            // Step 5: Login unknown packet (required for login)
            sendPacket(socket, PACKET_TYPES.LOGIN_UNKNOWN, Buffer.alloc(0), socket.id);

            // Step 6: Send categories (skip for Paltalk 8 - may cause freeze)
            const isPaltalk8Login = socket.clientVersion === 86 || socket.paltalk8UserData;
            if (!isPaltalk8Login) {
                const categoryBuffer = await this.createCategoryBuffer();
                sendPacket(socket, PACKET_TYPES.CATEGORY_LIST, categoryBuffer, socket.id);
            } else {
                logger.info('Skipping CATEGORY_LIST for Paltalk 8', { socketId: socket.id });
            }

            // Step 7: Send offline messages
            await this.sendOfflineMessages(socket, user);

            // Step 8: Notify buddies that this user is now online
            await this.sendBuddyStatusNotification(user, true);

            logger.logUserAction('login_success', user.uid, {
                nickname: user.nickname,
                sessionId: user.sessionId
            });

        } catch (error) {
            logger.error('Login failed', error, { socketId: socket.id });
        }
    }

    /**
     * Handle user logout
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleLogout(socket, payload) {
        try {
            const user = serverState.getUserBySocketId(socket.id);
            if (!user) {
                logger.debug('Logout request from unAuthenticated socket', { socketId: socket.id });
                return;
            }

            logger.info('User logout request', {
                uid: user.uid,
                nickname: user.nickname,
                socketId: socket.id
            });

            // IMPORTANT: Send buddy offline notifications BEFORE removing user from server state
            // This ensures we still have access to user data when notifying buddies
            await this.sendBuddyStatusNotification(user, false);

            // Remove user from server state (this will handle room cleanup etc.)
            const removed = serverState.removeUserConnection(socket, 'User logged out');
            
            if (removed) {
                // Send logout acknowledgment if needed
                try {
                    const logoutResponse = Buffer.alloc(4);
                    logoutResponse.writeUInt32BE(1, 0); // Success
                    sendPacket(socket, PACKET_TYPES.LOGOUT, logoutResponse, socket.id);
                } catch (sendError) {
                    // Don't fail if we can't send response (socket might be closing)
                    logger.debug('Could not send logout response', { error: sendError.message });
                }

                logger.info('User logout completed', {
                    uid: user.uid,
                    nickname: user.nickname
                });
            } else {
                logger.warn('Failed to remove user during logout', {
                    uid: user.uid,
                    nickname: user.nickname
                });
            }

        } catch (error) {
            logger.error('Error handling logout', error, { socketId: socket.id });
        }
    }

    async handleRoomJoin(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        // Enhanced debugging for room ID conversion
        const roomIdBuffer = payload.slice(0, 4);
        const roomId = Utils.hexToDec(roomIdBuffer);
        
        // Log detailed conversion info for debugging
        logger.info('Room join request details', {
            userId: user.uid,
            nickname: user.nickname,
            payloadLength: payload.length,
            payloadHex: payload.toString('hex'),
            roomIdBufferHex: roomIdBuffer.toString('hex'),
            roomIdBufferBytes: Array.from(roomIdBuffer),
            convertedRoomId: roomId,
            manualConversion: roomIdBuffer.readUInt32BE(0),
            conversionMatch: roomId === roomIdBuffer.readUInt32BE(0)
        });
        
        const room = serverState.getRoom(roomId);
        
        if (!room) {
            // Get valid room ranges for debugging
            const allRooms = serverState.getAllRooms();
            const roomIdRanges = {
                lowest: Math.min(...allRooms.map(r => r.id)),
                highest: Math.max(...allRooms.map(r => r.id)),
                topRooms: allRooms.filter(r => r.id >= 10001 && r.id <= 10015).map(r => r.id),
                featuredRooms: allRooms.filter(r => r.id >= 20001 && r.id <= 20015).map(r => r.id),
                religiousRooms: allRooms.filter(r => r.id >= 80001 && r.id <= 80013).map(r => r.id)
            };
            
            logger.warn('Attempt to join non-existent room', { 
                roomId, 
                userId: user.uid,
                nickname: user.nickname,
                totalRoomsInMemory: allRooms.length,
                validRoomIdRange: `${roomIdRanges.lowest} - ${roomIdRanges.highest}`,
                sampleValidRooms: {
                    topRooms: roomIdRanges.topRooms.slice(0, 5),
                    featuredRooms: roomIdRanges.featuredRooms.slice(0, 3),
                    religiousRooms: roomIdRanges.religiousRooms.slice(0, 3)
                },
                isRoomIdOutOfRange: roomId < roomIdRanges.lowest || roomId > roomIdRanges.highest
            });
            
            // Send an error response to the client
            const errorMessage = `Room ${roomId} does not exist. Valid room range: ${roomIdRanges.lowest}-${roomIdRanges.highest}`;
            const errorPayload = Buffer.from(errorMessage, 'utf8');
            socket.write(Buffer.concat([
                Buffer.from([0x01, 0x37, 0x00, 0x1D]), // Error packet header
                Buffer.from([errorPayload.length & 0xFF, (errorPayload.length >> 8) & 0xFF]), // Length
                errorPayload
            ]));
            
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

        // Check if room is closed and user has permission to access it
        if (room.isClosed && !room.isAccessibleTo(user)) {
            logger.warn('User attempted to join closed room without permission', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                roomName: room.name,
                isGlobalAdmin: user.isAdmin(),
                isRoomOwner: room.createdBy === user.uid
            });
            
            // Send error response - room appears to not exist to regular users
            const errorMessage = `Room ${roomId} does not exist.`;
            const errorPayload = Buffer.from(errorMessage, 'utf8');
            socket.write(Buffer.concat([
                Buffer.from([0x01, 0x37, 0x00, 0x1D]), // Error packet header
                Buffer.from([errorPayload.length & 0xFF, (errorPayload.length >> 8) & 0xFF]), // Length
                errorPayload
            ]));
            return;
        }

        // If room is closed but user is admin/owner, reopen the room automatically
        if (room.isClosed && room.isAccessibleTo(user)) {
            logger.info('Admin/Owner joining closed room - reopening automatically', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                roomName: room.name,
                isGlobalAdmin: user.isAdmin(),
                isRoomOwner: room.createdBy === user.uid,
                roomClosedStateBefore: room.isClosed
            });
            
            await room.reopenRoom(user.uid);
            
            // Verify the room was actually reopened by checking BOTH the room object AND the serverState reference
            const roomFromServerState = serverState.getRoom(room.id);
            logger.info('Room reopening completed - verification', {
                roomId: room.id,
                roomName: room.name,
                closedStateAfter: room.isClosed,
                serverStateRoomClosed: roomFromServerState ? roomFromServerState.isClosed : 'ROOM_NOT_FOUND',
                reopenSuccessful: !room.isClosed,
                roomObjectsMatch: room === roomFromServerState,
                objectReference: room.constructor.name + '_' + room.id
            });
            
            // CRITICAL: If there's a mismatch, log it as an error
            if (roomFromServerState && room.isClosed !== roomFromServerState.isClosed) {
                logger.error('ROOM STATE MISMATCH: Room object and ServerState room have different closed states!', {
                    roomId: room.id,
                    roomObjectClosed: room.isClosed,
                    serverStateRoomClosed: roomFromServerState.isClosed,
                    roomObjectsAreSame: room === roomFromServerState
                });
            }
        }

        logger.info('Attempting to add user to room', {
            userId: user.uid,
            nickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            isInvisible,
            isAdmin,
            currentUsersInRoom: Array.from(room.users.keys()),
            currentUserNicknames: Array.from(room.users.values()).map(u => u.nickname)
        });

        if (room.addUser(user, !isInvisible, isAdmin)) {
            await this.sendRoomJoinData(socket, room, user, isAdmin);
            
            // *** REAL-TIME BROADCAST: Notify other users that someone joined ***
            if (!isInvisible) {
                // FIXED: Use same format as user list - not just room+user IDs
                const roomUser = room.getUser(user.uid);
                // Check if user is red dotted - if so, force mic=0 regardless of their actual mic permission
                const effectiveMic = room.canUserUseVoice(user.uid) ? roomUser.mic : 0;
                const userJoinedString = `group_id=${room.id}\nuid=${user.uid}\nnickname=${user.nickname}\nadmin=${roomUser.admin}\ncolor=${roomUser.color}\nmic=${effectiveMic}\npub=${roomUser.pub}\naway=${roomUser.away}`;
                const userJoinedData = Buffer.concat([
                    Buffer.from(userJoinedString),
                    Buffer.from([0xC8]) // Delimiter
                ]);
                
                this.broadcastToRoom(room, PACKET_TYPES.ROOM_USER_JOINED, userJoinedData, user.socket);
                
                logger.info('Broadcasting user joined to room', {
                    userId: user.uid,
                    nickname: user.nickname,
                    roomId: room.id,
                    roomName: room.name,
                    isAdmin,
                    userCount: room.getUserCount()
                });
            }
            
            // Check if user got automatic mic permissions and send mic packets
            const roomUser = room.getUser(user.uid);
            if (roomUser && roomUser.mic === 1 && room.isVoice) {
                logger.info('Granting automatic mic permission', {
                    userId: user.uid,
                    nickname: user.nickname,
                    roomId: room.id,
                    roomName: room.name,
                    isAdmin
                });
                
                // Send mic permission packet to the user
                const roomIdHex = Utils.decToHex(room.id);
                sendPacket(socket, PACKET_TYPES.PACKET_ROOM_NEW_USER_MIC, Buffer.from(roomIdHex, 'hex'), socket.id);
                
                // Notify other users that this user has mic permissions
                const micNotificationData = Buffer.from(
                    roomIdHex + Utils.decToHex(user.uid) + '01', // 01 = mic granted
                    'hex'
                );
                
                // this was causing our reconnect issue in voice rooms
                // room.getAllUsers().forEach(otherUserData => {
                //     if (otherUserData.uid !== user.uid) {
                //         const otherUser = serverState.getUser(otherUserData.uid);
                //         if (otherUser && otherUser.socket) {
                //             sendPacket(otherUser.socket, PACKET_TYPES.PACKET_ROOM_MIC_GIVEN_REMOVED, micNotificationData, otherUser.socket.id);
                //         }
                //     }
                // });
            }
            
            // *** REAL-TIME BROADCAST: Send updated user lists to everyone ***
            this.broadcastUserListUpdate(room);
        } else {
            logger.error('Failed to add user to room', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                roomName: room.name,
                isInvisible,
                isAdmin,
                reason: 'room.addUser() returned false',
                currentUsersInRoom: Array.from(room.users.keys()),
                currentUserNicknames: Array.from(room.users.values()).map(u => u.nickname)
            });
        }
    }

    /**
     * Handle room join request packet (-311)
     * This packet contains room join parameters in key-value format
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleRoomJoinRequest(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        logger.info('Room join request packet received', {
            userId: user.uid,
            nickname: user.nickname,
            payloadHex: payload.toString('hex'),
            payloadLength: payload.length
        });

        try {
            // Decode the payload as UTF-8 string containing key-value pairs
            const payloadString = payload.toString('utf8');
            
            logger.debug('Room join request data', {
                userId: user.uid,
                payloadString: payloadString.substring(0, 200) // Truncate for logs
            });

            // Parse key-value pairs separated by newlines
            const params = {};
            payloadString.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value !== undefined) {
                    params[key.trim()] = value.trim();
                }
            });

            logger.info('Parsed room join parameters', {
                userId: user.uid,
                nickname: user.nickname,
                params: params
            });

            // Extract room parameters
            const affId = parseInt(params.aff); // Affiliation ID (not room ID)
            const roomName = params.name; // Room name
            const invisible = params.invis === '1'; // Invisible mode
            const voicePort = parseInt(params.port) || 2090; // Voice port
            const roomLock = params.lock || ''; // Room password/lock

            if (!roomName) {
                logger.warn('Invalid room join request - missing room name', {
                    userId: user.uid,
                    affId,
                    roomName,
                    params
                });
                return;
            }

            // Find room by name since aff is not the room ID
            const allRooms = serverState.getAllRooms();
            const room = allRooms.find(r => r.name === roomName);
            
            if (!room) {
                logger.warn('Room join request for non-existent room by name', {
                    userId: user.uid,
                    requestedRoomName: roomName,
                    affId,
                    availableRooms: allRooms.slice(0, 5).map(r => ({ id: r.id, name: r.name }))
                });
                return;
            }

            logger.info('Found room by name', {
                userId: user.uid,
                roomName,
                roomId: room.id,
                affId
            });

            // Check room password if provided
            if (roomLock && room.password && roomLock !== room.password) {
                logger.warn('Incorrect room password in join request', {
                    userId: user.uid,
                    roomId: room.id,
                    roomName
                });
                return;
            }

            logger.info('Processing room join request', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                roomName,
                invisible,
                voicePort,
                hasPassword: !!roomLock
            });

            // Create standard room join payload format and delegate to handleRoomJoin
            // Format: 4 bytes room ID + 2 bytes flags
            const roomJoinPayload = Buffer.alloc(6);
            roomJoinPayload.writeUInt32BE(room.id, 0); // Room ID
            roomJoinPayload.writeUInt16BE(invisible ? 1 : 0, 4); // Invisible flag

            // Delegate to the standard room join handler
            await this.handleRoomJoin(socket, roomJoinPayload);

        } catch (error) {
            logger.error('Error processing room join request', error, {
                userId: user.uid,
                nickname: user.nickname,
                payloadHex: payload.toString('hex'),
                errorMessage: error.message
            });
        }
    }

    async handleRoomLeave(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const room = serverState.getRoom(roomId);
        
        // Check if user is actually in this room
        if (room && user.isInRoom(roomId) && room.removeUser(user)) {
            // Reset video publishing status when leaving room
            user.pub = 'n';
            
            // *** REAL-TIME BROADCAST: Notify other users that someone left ***
            // FIXED: Use raw binary format - 4 bytes room ID + 4 bytes user ID
            const userLeftData = Buffer.alloc(8);
            userLeftData.writeUInt32BE(roomId, 0);
            userLeftData.writeUInt32BE(user.uid, 4);
            this.broadcastToRoom(room, PACKET_TYPES.ROOM_USER_LEFT, userLeftData, user.socket);
            
            logger.info('Broadcasting user left room', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                roomName: room.name,
                remainingUsers: room.getUserCount()
            });
            
            // NOTE: Removed broadcastUserListUpdate to prevent duplicate broadcasts
            // that cause client disconnections. The ROOM_USER_LEFT packet is sufficient
            // for clients to update their user lists automatically.

            // Auto-delete temporary rooms (NOT permanent database rooms)
            if (room.shouldAutoDelete()) {
                logger.warn('Attempting to auto-delete room', { 
                    roomId: room.id, 
                    roomName: room.name,
                    isPermanent: room.isPermanent,
                    userCount: room.users.size 
                });
                
                // Only delete if it's truly a temporary room (not from database)
                if (!room.isPermanent) {
                    serverState.removeRoom(room.id);
                    logger.info('Auto-deleted temporary room', { 
                        roomId: room.id, 
                        roomName: room.name 
                    });
                } else {
                    logger.warn('Prevented auto-deletion of permanent room', { 
                        roomId: room.id, 
                        roomName: room.name 
                    });
                }
            }
        }
    }

    /**
     * Handle room close packet - when a room is being closed
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleRoomClose(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        // Extract room ID from payload (first 4 bytes)
        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const room = serverState.getRoom(roomId);
        
        if (!room) {
            logger.warn('Room close requested for non-existent room', { 
                roomId, 
                userId: user.uid,
                nickname: user.nickname
            });
            return;
        }

        // Check if user has permission to close the room
        // Only room owner, global admins, or room admins can close rooms
        const userInRoom = room.getUser(user.uid);
        const isRoomAdmin = userInRoom && userInRoom.isRoomAdmin;
        const isGlobalAdmin = user.isAdmin();
        const isRoomOwner = room.createdBy === user.uid;
        
        if (!isRoomAdmin && !isGlobalAdmin && !isRoomOwner) {
            logger.warn('User without admin privileges attempted to close room', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                roomName: room.name,
                isRoomAdmin,
                isGlobalAdmin,
                isRoomOwner
            });
            return;
        }

        logger.info('Room close initiated', {
            userId: user.uid,
            nickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            userCount: room.getUserCount(),
            adminType: isGlobalAdmin ? 'global_admin' : isRoomOwner ? 'room_owner' : 'room_admin'
        });

        // Create ROOM_CLOSED packet with room ID and close message
        // Format: Room ID (4 bytes) + Close message text
        const closeMessage = `Room ${room.name} has been closed.`;
        const roomClosedBuffer = Buffer.concat([
            Buffer.from(Utils.decToHex(roomId), 'hex'),  // Room ID as 4-byte hex
            Buffer.from(closeMessage, 'utf8')            // Close message text
        ]);

        // Send ROOM_CLOSED notification to all users currently in the room
        this.broadcastToRoom(room, PACKET_TYPES.ROOM_CLOSED, roomClosedBuffer);

        logger.info('ROOM_CLOSED packets sent to all users in room', {
            roomId: room.id,
            roomName: room.name,
            userCount: room.getUserCount(),
            packetType: `0x${PACKET_TYPES.ROOM_CLOSED.toString(16)}`,
            bufferFormat: 'binary 8-byte (room_id + padding)'
        });

        // Remove all users from the room
        const userIds = Array.from(room.users.keys());
        userIds.forEach(uid => {
            const roomUser = serverState.getUser(uid);
            if (roomUser) {
                room.removeUser(roomUser);
            }
        });

        // Close the room instead of removing it - this hides it from room lists
        // but allows admins to rejoin and reopen it later
        await room.closeRoom(user.uid);

        logger.info('Room closed and hidden from public lists', { 
            roomId: room.id, 
            roomName: room.name,
            closedBy: user.uid,
            closedByNickname: user.nickname
        });
    }

    async handleRoomCreate(socket, payload) {
        try {
            const user = serverState.getUserBySocketId(socket.id);
            if (!user) {
                logger.warn('ROOM_CREATE: User not found', { socketId: socket.id });
                return;
            }

            // Log the payload for debugging
            logger.info('ROOM_CREATE payload received', {
                userId: user.uid,
                nickname: user.nickname,
                payloadLength: payload.length,
                payloadHex: payload.toString('hex')
            });

            // Validate minimum payload length
            if (payload.length < 12) {
                logger.warn('ROOM_CREATE: Payload too short', { 
                    userId: user.uid, 
                    payloadLength: payload.length,
                    expectedMinimum: 12 
                });
                return;
            }

            // Parse payload components based on correct structure
            // Payload: [roomType:4][category:2][voicePort:4][roomName][0x0a][password]
            const roomTypeBytes = payload.slice(0, 4);
            const category = Utils.hexToDec(payload.slice(4, 6));
            const voicePort = payload.slice(6, 10); // Voice server port (4 bytes)
            
            // Determine room type and privacy from first 4 bytes
            const roomTypeHex = roomTypeBytes.toString('hex');
            let isVoice = 0;
            let isPrivate = 0;
            let isVideo = 0;
            
            if (roomTypeHex === '00000000') {
                // 00 = text group (public)
                isVoice = ROOM_TYPES.TEXT;
                isPrivate = 0;
            } else if (roomTypeHex === '00010000') {
                // 01 = private voice conference
                isVoice = ROOM_TYPES.VOICE;
                isPrivate = 1;
            } else if (roomTypeHex === '00020000') {
                // 02 = group (with voice)
                isVoice = ROOM_TYPES.VOICE;
                isPrivate = 0;
            } else if (roomTypeHex === '00030000') {
                // 03 = voice conference (public)
                isVoice = ROOM_TYPES.VOICE;
                isPrivate = 0;
            } else if (roomTypeHex === '00040000') {
                // 04 = video conference
                isVoice = ROOM_TYPES.VOICE;
                isPrivate = 0;
                isVideo = 1;
            } else if (roomTypeHex === '00050000') {
                // 05 = private text
                isVoice = ROOM_TYPES.TEXT;
                isPrivate = 1;
            } else if (roomTypeHex === '00060000') {
                // 06 = private video conference
                isVoice = ROOM_TYPES.VOICE;
                isPrivate = 1;
                isVideo = 1;
            }
            
            // Parse rating, room name and password
            const rating = payload.slice(10, 11).toString(); // Rating byte (G, R, X, etc.)
            const remainingPayload = payload.slice(11);
            const separatorIndex = remainingPayload.indexOf(0x0a); // Find 0x0a separator
            
            let roomName = '';
            let password = '';
            let isLocked = 0;
            
            if (separatorIndex !== -1) {
                // Room has password (locked)
                roomName = remainingPayload.slice(0, separatorIndex).toString('utf8').trim();
                password = remainingPayload.slice(separatorIndex + 1).toString('utf8').trim();
                isLocked = 1;
            } else {
                // No password (unlocked)
                roomName = remainingPayload.toString('utf8').trim();
                password = '';
                isLocked = 0;
            }

            // Validate room name
            if (!Utils.isValidInput(roomName, 50) || roomName.length === 0) {
                logger.warn('ROOM_CREATE: Invalid room name', { 
                    userId: user.uid, 
                    roomName: roomName,
                    roomNameLength: roomName.length 
                });
                return;
            }

            // Generate proper room ID (avoid collisions)
            const roomId = this.generateRoomId();

            // Create room data structure matching database schema
            const newRoomData = {
                id: roomId,
                nm: roomName,           // Use 'nm' to match database field
                catg: category,         // Use 'catg' to match database field
                r: rating,              // Rating from payload
                v: isVoice,             // Voice/text room type
                p: isPrivate,           // Private room flag from payload
                password: password,     // Password from payload if locked
                l: isLocked,            // Locked room flag from payload
                c: '000000000',         // color: default color
                mike: 1,                // mic enabled by default
                text: 1,                // text enabled by default
                video: isVideo,         // video flag based on room type
                topic: 'Welcome to the room!',
                owner: user.uid,        // Room owner UID
                cr: user.uid.toString(), // Creator UID (as string)
                created: new Date().toISOString(),
                isClosed: 0             // Room is open
            };

            logger.info('Creating new room', {
                roomId: roomId,
                roomName: roomName,
                category: category,
                rating: rating,
                roomTypeHex: roomTypeHex,
                roomTypeName: ROOM_TYPE_CODES.DISCOVERED[roomTypeHex] || 'Unknown Type',
                isVoice: isVoice,
                isPrivate: isPrivate,
                isVideo: isVideo,
                isLocked: isLocked,
                hasPassword: password.length > 0,
                passwordLength: password.length,
                password: password.length > 0 ? password : 'none',
                voicePortHex: voicePort.toString('hex'),
                separatorFound: separatorIndex !== -1,
                separatorIndex: separatorIndex,
                micEnabled: newRoomData.mike,
                textEnabled: newRoomData.text,
                videoEnabled: newRoomData.video,
                payloadHex: payload.toString('hex'),
                createdBy: user.uid,
                createdByNickname: user.nickname
            });

            const room = new Room(newRoomData, false);
            room.setServerState(serverState);
            
            // Add room to server state
            if (!serverState.addRoom(room)) {
                logger.error('Failed to add room to server state', {
                    roomId: roomId,
                    roomName: roomName,
                    userId: user.uid
                });
                return;
            }

            // Join the creator as admin
            if (room.addUser(user, true, true)) {
                await this.sendRoomJoinData(socket, room, user, true);
                
                logger.info('Room created successfully', {
                    roomId: roomId,
                    roomName: roomName,
                    createdBy: user.uid,
                    createdByNickname: user.nickname
                });
            } else {
                logger.error('Failed to add creator to room', {
                    roomId: roomId,
                    roomName: roomName,
                    userId: user.uid
                });
            }

        } catch (error) {
            logger.error('Error handling ROOM_CREATE', error, {
                socketId: socket.id,
                payloadLength: payload.length,
                payloadHex: payload.toString('hex')
            });
        }
    }

    /**
     * Generate a unique room ID
     * @returns {number} Unique room ID
     */
    generateRoomId() {
        let roomId;
        do {
            // Generate room ID in the range 60000-99999 to avoid conflicts with permanent rooms
            roomId = Math.floor(Math.random() * 40000) + 60000;
        } while (serverState.getRoom(roomId));
        
        return roomId;
    }
    

    async handleRoomMessage(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const room = serverState.getRoom(roomId);
        const rawMessage = payload.slice(4).toString('utf8');

        if (!room || !room.hasUser(user.uid)) {
            logger.warn('User trying to send message to room they are not in', {
                userId: user.uid,
                nickname: user.nickname,
                roomId,
                roomExists: !!room,
                userInRoom: room ? room.hasUser(user.uid) : false
            });
            return;
        }

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
        // Use proper buffer concatenation instead of hex string manipulation
        const messageBuffer = Buffer.concat([
            Buffer.from(Utils.decToHex(roomId), 'hex'),     // Room ID
            Buffer.from(Utils.decToHex(user.uid), 'hex'),   // Sender ID 
            Buffer.from(sanitizedMessage, 'utf8')           // Message content
        ]);

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

        logger.info('IM received', {
            senderUid: user.uid,
            senderNickname: user.nickname,
            receiverUid,
            receiverUidHex: payload.slice(0, 4).toString('hex'),
            content: content.toString('utf8'),
            isPaltalk8: socket.clientVersion === 86 || !!socket.paltalk8UserData
        });

        if (!Utils.isValidInput(content.toString('utf8'), 2000)) {
            logger.warn('Invalid IM content', { userId: user.uid });
            return;
        }

        // Check for admin commands (UID 1000001 for Paltalk 5, or 51000001 for Paltalk 8)
        if (receiverUid === 1000001 || receiverUid === 51000001) {
            logger.info('Admin command detected', { receiverUid, content: content.toString('utf8') });
            const response = this.adminCommands.processCommand(user, content.toString('utf8'));
            logger.info('Admin command response', { response });
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
            let statusCode = '00000000'; // Default to offline
            
            // Debug logging to track buddy status detection
            logger.debug('ADD_BUDDY: Checking buddy status', {
                userId: user.uid,
                userNickname: user.nickname,
                buddyUid: buddyUid,
                buddyNickname: buddyData.nickname,
                buddyFound: !!buddy,
                buddyIsOnline: buddy ? buddy.isOnline() : false,
                buddyMode: buddy ? buddy.mode : 'no buddy found',
                buddySocket: buddy ? !!buddy.socket : false,
                allOnlineUsers: serverState.getOnlineUsers().map(u => ({ uid: u.uid, nickname: u.nickname, mode: u.mode }))
            });
            
            if (buddy && buddy.isOnline()) {
                // Buddy is online - check their mode
                if (buddy.mode === USER_MODES.AWAY) {
                    statusCode = '00000046'; // Away status
                    logger.debug('ADD_BUDDY: Setting buddy as AWAY', { buddyUid, buddyNickname: buddyData.nickname });
                } else {
                    statusCode = '0000001E'; // Online status
                    logger.debug('ADD_BUDDY: Setting buddy as ONLINE', { buddyUid, buddyNickname: buddyData.nickname });
                }
            } else if (buddyData.nickname === 'Paltalk' || buddyUid === 1000001) {
                // Special case: Paltalk user should always appear online when added as buddy
                statusCode = '0000001E';
                logger.debug('ADD_BUDDY: Setting Paltalk user as online', { 
                    userId: user.uid, 
                    userNickname: user.nickname,
                    buddyUid: buddyUid,
                    buddyNickname: buddyData.nickname
                });
            } else {
                logger.debug('ADD_BUDDY: Setting buddy as OFFLINE', { 
                    buddyUid, 
                    buddyNickname: buddyData.nickname,
                    reason: buddy ? 'buddy not online' : 'buddy not found in serverState'
                });
            }
            // If buddy doesn't exist or is offline, statusCode remains '00000000' (offline)
            
            const statusBuffer = Buffer.from(Utils.decToHex(buddyUid) + statusCode, 'hex');
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, statusBuffer, socket.id);
            
            logger.debug('ADD_BUDDY: Status packet sent', {
                userId: user.uid,
                buddyUid: buddyUid,
                buddyNickname: buddyData.nickname,
                statusCode,
                statusHex: Utils.decToHex(buddyUid) + statusCode,
                statusMeaning: statusCode === '0000001E' ? 'online' : statusCode === '00000046' ? 'away' : 'offline'
            });
        }
    }

    async handleRemoveBuddy(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        const buddyUid = Utils.hexToDec(payload.slice(0, 4));
        
        // Remove buddy from user's buddy list
        if (user.removeBuddy(buddyUid)) {
            // Update database
            await this.db.updateUserBuddies(user.uid, user.buddies);
            
            // Send updated buddy list
            const buddyList = this.createBuddyListBuffer(user);
            sendPacket(socket, PACKET_TYPES.BUDDY_LIST, buddyList, socket.id);
            
            logger.info('Buddy removed', { 
                userId: user.uid, 
                buddyUid 
            });
        } else {
            logger.warn('Attempt to remove non-existent buddy', { 
                userId: user.uid, 
                buddyUid 
            });
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
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        // Log Paltalk 8 category request (client explicitly requested it)
        const isPaltalk8 = socket.clientVersion === 86 || socket.paltalk8UserData;
        if (isPaltalk8) {
            logger.info('Processing REFRESH_CATEGORIES for Paltalk 8 (client requested)', {
                socketId: socket.id,
                payloadHex: payload.toString('hex')
            });
        }

        const categoryId = Utils.hexToDec(payload.slice(8, 12));

        if (categoryId === 0) {
            // Send category counts
            const countsBuffer = this.createCategoryCountsBuffer();
            sendPacket(socket, PACKET_TYPES.CATEGORY_COUNT, countsBuffer, socket.id);
        } else {
            // Send room list for category (pass user context to filter closed rooms)
            const roomsBuffer = this.createRoomListBuffer(categoryId, user);
            sendPacket(socket, PACKET_TYPES.ROOM_LIST, roomsBuffer, socket.id);
        }
    }

    async handleModeChange(socket, newMode) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        const oldMode = user.mode;
        user.setMode(newMode);
        
        let statusCode;
        switch(newMode) {
            case USER_MODES.AWAY:
                statusCode = '00000046';
                break;
            case USER_MODES.ONLINE:
            default:
                statusCode = '0000001E';
                break;
        }
        
        const statusBuffer = Buffer.from(Utils.decToHex(user.uid) + statusCode, 'hex');
        sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, statusBuffer, socket.id);
        
        // Broadcast to buddies
        this.broadcastStatusChange(user, newMode);
        
        // Update user lists in all rooms the user is in
        user.getRoomIds().forEach(roomId => {
            const room = serverState.getRoom(roomId);
            if (room) {
                room.getVisibleUsers().forEach(roomUser => {
                    if (roomUser.socket && roomUser.uid !== user.uid) {
                        this.sendUserList(roomUser.socket, room);
                    }
                });
            }
        });
        
        logger.debug('User mode changed', {
            userId: user.uid,
            nickname: user.nickname,
            oldMode,
            newMode,
            statusCode,
            awayStatus: user.away,
            status: newMode === USER_MODES.AWAY ? 'away' : 'online'
        });
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

        // Check if user is already requesting mic
        if (room.isUserRequestingMic(user.uid)) {
            logger.debug('User already requesting mic', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id
            });
            return;
        }

        logger.info('Mic request received', {
            userId: user.uid,
            nickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            isVoiceRoom: room.isVoice,
            userAdmin: user.isAdmin(),
            roomMicEnabled: room.micEnabled
        });

        // Set mic request status for this user
        room.setUserMicRequest(user.uid, true);

        // Broadcast PACKET_ROOM_USER_MICREQUEST_ON to all users in room
        const micRequestData = Buffer.concat([
            Buffer.from(Utils.decToHex(room.id), 'hex'),
            Buffer.from(Utils.decToHex(user.uid), 'hex')
        ]);
        
        room.getAllUsers().forEach(otherUserData => {
            // Send to ALL users in room (including the requesting user for confirmation)
            const otherUser = serverState.getUser(otherUserData.uid);
            if (otherUser && otherUser.socket) {
                sendPacket(otherUser.socket, PACKET_TYPES.PACKET_ROOM_USER_MICREQUEST_ON, micRequestData, otherUser.socket.id);
            }
        });

        logger.info('Mic request broadcasted - user is now requesting mic', {
            userId: user.uid,
            nickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            totalUsersNotified: room.getAllUsers().length
        });
    }

    async handleMicUnrequest(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) {
            logger.warn('Mic unrequest: No user found for socket', { socketId: socket.id });
            return;
        }

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const room = serverState.getRoom(roomId);
        
        if (!room || !room.hasUser(user.uid)) {
            logger.warn('Mic unrequest for room user is not in', { 
                userId: user.uid, 
                roomId 
            });
            return;
        }

        // Check if user is actually requesting mic
        if (!room.isUserRequestingMic(user.uid)) {
            logger.debug('User not requesting mic', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id
            });
            return;
        }

        logger.info('Mic unrequest received', {
            userId: user.uid,
            nickname: user.nickname,
            roomId: room.id,
            roomName: room.name
        });

        // Clear mic request status for this user
        room.setUserMicRequest(user.uid, false);

        // Broadcast PACKET_ROOM_USER_MICREQUEST_OFF to all users in room
        const micRequestData = Buffer.concat([
            Buffer.from(Utils.decToHex(room.id), 'hex'),
            Buffer.from(Utils.decToHex(user.uid), 'hex')
        ]);
        
        room.getAllUsers().forEach(otherUserData => {
            // Send to ALL users in room (including the unrequesting user for confirmation)
            const otherUser = serverState.getUser(otherUserData.uid);
            if (otherUser && otherUser.socket) {
                sendPacket(otherUser.socket, PACKET_TYPES.PACKET_ROOM_USER_MICREQUEST_OFF, micRequestData, otherUser.socket.id);
            }
        });

        logger.info('Mic unrequest broadcasted - user no longer requesting mic', {
            userId: user.uid,
            nickname: user.nickname,
            roomId: room.id,
            roomName: room.name,
            totalUsersNotified: room.getAllUsers().length
        });
    }

    async handleRedDotUser(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) {
            logger.warn('Red dot request: No user found for socket', { socketId: socket.id });
            return;
        }

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const targetUin = Utils.hexToDec(payload.slice(4, 8));
        const room = serverState.getRoom(roomId);
        
        if (!room || !room.hasUser(user.uid)) {
            logger.warn('Red dot request for room user is not in', { 
                userId: user.uid, 
                roomId 
            });
            return;
        }

        // Check if user has admin privileges in this room
        const roomUser = room.getUser(user.uid);
        if (!roomUser || !roomUser.admin) {
            logger.warn('Red dot request by non-admin user', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id
            });
            return;
        }

        logger.info('Red dot request received', {
            adminUserId: user.uid,
            adminNickname: user.nickname,
            targetUin,
            roomId: room.id,
            roomName: room.name,
            isAllUsers: targetUin === 0xFFFFFFFF
        });

        if (targetUin === 0xFFFFFFFF) {
            // Red dot all users in room
            room.getAllUsers().forEach(userData => {
                if (userData.uid !== user.uid) { // Don't red dot the admin
                    this.applyRedDotToUser(room, userData.uid, true);
                }
            });
        } else {
            // Red dot specific user
            this.applyRedDotToUser(room, targetUin, true);
        }
    }

    async handleUnredDotUser(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) {
            logger.warn('Unred dot request: No user found for socket', { socketId: socket.id });
            return;
        }

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const targetUin = Utils.hexToDec(payload.slice(4, 8));
        const room = serverState.getRoom(roomId);
        
        if (!room || !room.hasUser(user.uid)) {
            logger.warn('Unred dot request for room user is not in', { 
                userId: user.uid, 
                roomId 
            });
            return;
        }

        // Check if user has admin privileges in this room
        const roomUser = room.getUser(user.uid);
        if (!roomUser || !roomUser.admin) {
            logger.warn('Unred dot request by non-admin user', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id
            });
            return;
        }

        logger.info('Unred dot request received', {
            adminUserId: user.uid,
            adminNickname: user.nickname,
            targetUin,
            roomId: room.id,
            roomName: room.name,
            isAllUsers: targetUin === 0xFFFFFFFF
        });

        if (targetUin === 0xFFFFFFFF) {
            // Unred dot all users in room
            room.getAllUsers().forEach(userData => {
                if (userData.uid !== user.uid) { // Don't affect the admin
                    this.applyRedDotToUser(room, userData.uid, false);
                }
            });
        } else {
            // Unred dot specific user
            this.applyRedDotToUser(room, targetUin, false);
        }
    }

    applyRedDotToUser(room, targetUin, isRedDotOn) {
        const targetUser = serverState.getUser(targetUin);
        const roomUser = room.getUser(targetUin);
        
        if (!targetUser || !roomUser) {
            logger.warn('Red dot target user not found', { targetUin, roomId: room.id });
            return;
        }

        // Update red dot status (this will also update persistent storage)
        room.setUserRedDot(targetUin, isRedDotOn);
        
        logger.info(`Red dot ${isRedDotOn ? 'applied' : 'removed'}`, {
            targetUserId: targetUin,
            targetNickname: targetUser.nickname,
            roomId: room.id,
            roomName: room.name
        });

        // Send red dot status to all users in room
        const redDotData = Buffer.concat([
            Buffer.from(Utils.decToHex(room.id), 'hex'),
            Buffer.from(Utils.decToHex(targetUin), 'hex')
        ]);

        const packetType = isRedDotOn ? 
            PACKET_TYPES.PACKET_ROOM_USER_RED_DOT_ON : 
            PACKET_TYPES.PACKET_ROOM_USER_RED_DOT_OFF;

        room.getAllUsers().forEach(userData => {
            const user = serverState.getUser(userData.uid);
            if (user && user.socket) {
                sendPacket(user.socket, packetType, redDotData, user.socket.id);
            }
        });

        // Also send updated user status to reflect mic permission change due to red dot
        const effectiveMic = room.canUserUseVoice(targetUin) ? roomUser.mic : 0;
        const userUpdateString = `group_id=${room.id}\nuid=${targetUin}\nnickname=${targetUser.nickname}\nadmin=${roomUser.admin}\ncolor=${roomUser.color}\nmic=${effectiveMic}\npub=${roomUser.pub}\naway=${roomUser.away}`;
        const userUpdateData = Buffer.concat([
            Buffer.from(userUpdateString),
            Buffer.from([0xC8]) // Delimiter
        ]);

        // Send user update to all users in room to reflect the mic status change
        room.getAllUsers().forEach(userData => {
            const user = serverState.getUser(userData.uid);
            if (user && user.socket) {
                sendPacket(user.socket, PACKET_TYPES.ROOM_USER_JOINED, userUpdateData, user.socket.id);
            }
        });
    }

    async handleRedDotTextToggle(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const toggleValue = Utils.hexToDec(payload.slice(4, 8));
        const room = serverState.getRoom(roomId);
        
        if (!room || !room.hasUser(user.uid)) {
            logger.warn('Red dot text toggle for room user is not in', { 
                userId: user.uid, 
                roomId 
            });
            return;
        }

        // Check if user has admin privileges
        const roomUser = room.getUser(user.uid);
        if (!roomUser || !roomUser.admin) {
            logger.warn('Red dot text toggle by non-admin user', {
                userId: user.uid,
                roomId: room.id
            });
            return;
        }

        // Toggle red dot text effect setting
        room.redDotAffectsText = toggleValue === 1;
        
        logger.info('Red dot text effect toggled', {
            adminUserId: user.uid,
            roomId: room.id,
            redDotAffectsText: room.redDotAffectsText
        });
    }

    async handleRedDotVideoToggle(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const toggleValue = Utils.hexToDec(payload.slice(4, 8));
        const room = serverState.getRoom(roomId);
        
        if (!room || !room.hasUser(user.uid)) {
            logger.warn('Red dot video toggle for room user is not in', { 
                userId: user.uid, 
                roomId 
            });
            return;
        }

        // Check if user has admin privileges
        const roomUser = room.getUser(user.uid);
        if (!roomUser || !roomUser.admin) {
            logger.warn('Red dot video toggle by non-admin user', {
                userId: user.uid,
                roomId: room.id
            });
            return;
        }

        // Toggle red dot video effect setting
        room.redDotAffectsVideo = toggleValue === 1;
        
        logger.info('Red dot video effect toggled', {
            adminUserId: user.uid,
            roomId: room.id,
            redDotAffectsVideo: room.redDotAffectsVideo
        });
    }

    async handleRoomBanner(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user || !user.currentRoom) return;

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const room = serverState.getRoom(roomId);
        const message = payload.slice(4).toString('utf8');
        
        // Check if user has admin privileges (global admin OR room admin)
        const userInRoom = room ? room.hasUser(user.uid) : false;
        const isGlobalAdmin = user.isAdmin();
        const roomUser = room ? room.getUser(user.uid) : null;
        const isRoomAdmin = roomUser && roomUser.isRoomAdmin;
        const hasAdminPrivileges = isGlobalAdmin || isRoomAdmin;
        
        logger.info('ROOM_BANNER_MESSAGE handler called', {
            userId: user.uid,
            userNickname: user.nickname,
            roomId: roomId,
            roomExists: !!room,
            messageLength: message.length,
            message: message.substring(0, 100),
            userInRoom: userInRoom,
            isGlobalAdmin: isGlobalAdmin,
            isRoomAdmin: isRoomAdmin,
            hasAdminPrivileges: hasAdminPrivileges,
            userCurrentRoom: user.currentRoom
        });
        
        if (!room || !userInRoom || !hasAdminPrivileges) {
            logger.warn('ROOM_BANNER_MESSAGE validation failed', {
                roomExists: !!room,
                userInRoom: userInRoom,
                isGlobalAdmin: isGlobalAdmin,
                isRoomAdmin: isRoomAdmin,
                hasAdminPrivileges: hasAdminPrivileges,
                userId: user.uid,
                roomId: roomId,
                reason: !room ? 'room_not_found' : 
                        !userInRoom ? 'user_not_in_room' : 
                        !hasAdminPrivileges ? 'insufficient_privileges' : 'unknown'
            });
            return;
        }

        // FIXED: Update room topic instead of status message
        const oldTopicBeforeSet = room.topic;
        room.setTopic(message, user.uid);
        const newTopicAfterSet = room.topic;
        
        logger.info('Room topic updated in memory', {
            roomId: room.id,
            roomName: room.name,
            oldTopic: oldTopicBeforeSet.substring(0, 50),
            newTopic: newTopicAfterSet.substring(0, 50),
            topicChanged: oldTopicBeforeSet !== newTopicAfterSet,
            isPermanent: room.isPermanent,
            hasServerState: !!room.serverState,
            hasDatabaseManager: !!(room.serverState && room.serverState.databaseManager)
        });
        
        // CRITICAL: Persist topic to database for permanent rooms
        if (room.isPermanent && room.serverState && room.serverState.databaseManager) {
            try {
                logger.info('Attempting to persist topic to database', {
                    roomId: room.id,
                    roomName: room.name,
                    topicToPersist: message,
                    updateData: { topic: message }
                });
                
                const updateResult = await room.serverState.databaseManager.updateRoom(room.id, { topic: message });
                
                logger.info('Database update result', {
                    roomId: room.id,
                    roomName: room.name,
                    updateResult: updateResult,
                    topicPersisted: message.substring(0, 100),
                    setBy: user.uid,
                    setByNickname: user.nickname
                });
                
                // CRITICAL FIX: Reload room from database to ensure in-memory object stays in sync
                // This prevents topic persistence issues when users re-enter rooms
                const updatedRoomData = await room.serverState.databaseManager.getRoomById(room.id);
                logger.info('Database reload result', {
                    roomId: room.id,
                    roomName: room.name,
                    dataReloaded: !!updatedRoomData,
                    reloadedTopic: updatedRoomData ? updatedRoomData.topic : 'NO_DATA',
                    currentRoomTopic: room.topic.substring(0, 50)
                });
                
                if (updatedRoomData && updatedRoomData.topic !== undefined) {
                    const oldTopic = room.topic;
                    room.topic = updatedRoomData.topic;
                    logger.info('Room topic reloaded from database to ensure persistence', {
                        roomId: room.id,
                        roomName: room.name,
                        oldTopic: oldTopic.substring(0, 50),
                        newTopic: room.topic.substring(0, 50),
                        reloadedFromDb: true
                    });
                } else {
                    logger.warn('Failed to reload topic from database', {
                        roomId: room.id,
                        roomName: room.name,
                        updatedRoomDataExists: !!updatedRoomData,
                        topicField: updatedRoomData ? updatedRoomData.topic : 'NO_ROOM_DATA'
                    });
                }
            } catch (error) {
                logger.error('Failed to persist room topic to database', error, {
                    roomId: room.id,
                    roomName: room.name,
                    topic: message.substring(0, 100),
                    setBy: user.uid,
                    errorMessage: error.message,
                    errorStack: error.stack
                });
            }
        } else {
            logger.warn('Skipping database persistence', {
                roomId: room.id,
                roomName: room.name,
                isPermanent: room.isPermanent,
                hasServerState: !!room.serverState,
                hasDatabaseManager: !!(room.serverState && room.serverState.databaseManager),
                reason: !room.isPermanent ? 'not_permanent' : 
                        !room.serverState ? 'no_server_state' : 
                        'no_database_manager'
            });
        }
        
        // FIXED: Use proper buffer concatenation instead of hex encoding to prevent reconnections
        const bannerBuffer = Buffer.concat([
            Buffer.from(Utils.decToHex(roomId), 'hex'),
            Buffer.from('00000000', 'hex'),
            payload.slice(4)
        ]);
        
        this.broadcastToRoom(room, PACKET_TYPES.ROOM_TOPIC, bannerBuffer);
        
        logger.info('Room topic updated and broadcast', {
            roomId: room.id,
            roomName: room.name,
            newTopic: message.substring(0, 100), // Truncate for logs
            setBy: user.uid,
            setByNickname: user.nickname,
            isPermanent: room.isPermanent
        });
    }

    async handleVersions(socket, payload) {
        // Skip response for Paltalk 8 - may cause freeze
        const isPaltalk8 = socket.clientVersion === 86 || socket.paltalk8UserData;
        if (isPaltalk8) {
            logger.info('Skipping VERSIONS response for Paltalk 8', { socketId: socket.id });
            return;
        }
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
     * Send system message to user (from Paltalk buddy)
     * @param {Socket} socket
     * @param {string} message
     */
    sendSystemMessage(socket, message) {
        // Use mapped UID for Paltalk 8 clients (51000001), original for Paltalk 5 (1000001)
        // Paltalk 8 uses client version 86 or 14
        const isPaltalk8 = socket.clientVersion === 86 || socket.clientVersion === 14 || socket.paltalk8UserData;
        const senderUid = isPaltalk8 ? 51000001 : 1000001;

        logger.info('Sending system message', {
            isPaltalk8,
            clientVersion: socket.clientVersion,
            paltalk8UserData: !!socket.paltalk8UserData,
            senderUid,
            senderUidHex: Utils.decToHex(senderUid),
            messageLength: message.length,
            message: message.substring(0, 100)
        });

        const responseBuffer = Buffer.concat([
            Buffer.from(Utils.decToHex(senderUid), 'hex'),
            Buffer.from(message, 'utf8')
        ]);

        sendPacket(socket, PACKET_TYPES.IM_IN, responseBuffer, socket.id);
    }

    /**
     * Send login failure response to client
     * @param {Socket} socket
     * @param {string} reason - Reason for login failure
     */
    sendLoginFailure(socket, reason) {
        logger.warn('Sending login failure', {
            socketId: socket.id,
            reason
        });

        // Send a login failure response
        // The failure response uses a specific format that the client recognizes
        const failureResponse = Buffer.alloc(8);
        failureResponse.writeUInt32BE(0, 0);  // UID = 0 indicates failure
        failureResponse.writeUInt32BE(0, 4);  // Failure flag
        sendPacket(socket, PACKET_TYPES.LOGIN, failureResponse, socket.id);
    }

    // Helper methods

    createBuddyListBuffer(user) {
        const buffers = [];
        const delimiter = Buffer.from([0xC8]);

        // Log user info for debugging
        logger.info('Creating buddy list buffer for user', {
            userId: user.uid,
            nickname: user.nickname,
            admin: user.admin,
            sup: user.sup,
            isAdmin: user.isAdmin(),
            isModerator: user.isModerator(),
            currentBuddyCount: user.buddies.length
        });

        // Create a copy of the user's buddies array
        let buddies = [...user.buddies];
        
        // If user has admin or supervisor privileges, inject Paltalk buddy
        if (user.isAdmin() || user.isModerator()) {
            logger.info('User has admin/supervisor privileges, checking for Paltalk buddy', {
                userId: user.uid,
                nickname: user.nickname,
                admin: user.admin,
                sup: user.sup
            });
            
            const paltalkBuddy = {
                uid: 1000001,
                nickname: 'Paltalk'
            };
            
            // Check if Paltalk is already in the buddy list
            const paltalkExists = buddies.some(buddy => buddy.uid === 1000001);
            
            logger.info('Paltalk buddy check result', {
                userId: user.uid,
                paltalkExists: paltalkExists,
                currentBuddies: buddies.map(b => ({ uid: b.uid, nickname: b.nickname }))
            });
            
            if (!paltalkExists) {
                // Add Paltalk to the beginning of the list
                buddies.unshift(paltalkBuddy);
                
                // Also add it to the user's actual buddy list for persistence
                user.addBuddy(paltalkBuddy);
                
                logger.info('Successfully injected Paltalk buddy for admin/supervisor user', {
                    userId: user.uid,
                    nickname: user.nickname,
                    admin: user.admin,
                    sup: user.sup,
                    newBuddyCount: buddies.length
                });
            } else {
                logger.info('Paltalk buddy already exists, skipping injection', {
                    userId: user.uid,
                    nickname: user.nickname
                });
            }
        } else {
            logger.info('User does not have admin/supervisor privileges, skipping Paltalk injection', {
                userId: user.uid,
                nickname: user.nickname,
                admin: user.admin,
                sup: user.sup
            });
        }

        buddies.forEach(buddy => {
            // Map buddy UID to Paltalk 8 range (50000000 + uid)
            const mappedUid = 50000000 + buddy.uid;
            const buddyString = `uid=${mappedUid}\nnickname=${buddy.nickname}`;
            buffers.push(Buffer.from(buddyString));
            buffers.push(delimiter);
        });

        logger.info('Final buddy list buffer created', {
            userId: user.uid,
            finalBuddyCount: buddies.length,
            bufferCount: buffers.length / 2, // Each buddy creates 2 buffers (data + delimiter)
            buddies: buddies.map(b => ({ uid: b.uid, nickname: b.nickname }))
        });

        return Buffer.concat(buffers);
    }

    /**
     * Send individual STATUS_CHANGE packets for each buddy during login
     * This is required for the client's buddy list UI to show correct status
     */
    sendBuddyStatusUpdatesOnLogin(socket, user) {
        // Use the same buddy list logic as createBuddyListBuffer to ensure consistency
        let buddies = [...user.buddies];
        
        // If user has admin or supervisor privileges and Paltalk isn't already in the list
        if (user.isAdmin() || user.isModerator()) {
            const paltalkExists = buddies.some(buddy => buddy.uid === 1000001);
            if (!paltalkExists) {
                buddies.unshift({
                    uid: 1000001,
                    nickname: 'Paltalk'
                });
            }
        }

        logger.info('sendBuddyStatusUpdatesOnLogin called', {
            userId: user.uid,
            buddyCount: buddies.length,
            buddies: buddies.map(b => ({ uid: b.uid, nickname: b.nickname }))
        });

        buddies.forEach(buddy => {
            // For now, show all buddies as online for testing
            const statusCode = '0000001E'; // Online status

            // Map buddy UID to Paltalk 8 range (50000000 + uid)
            const mappedUid = 50000000 + buddy.uid;
            logger.info('Sending buddy status', { mappedUid, statusCode, nickname: buddy.nickname });
            const statusBuffer = Buffer.from(Utils.decToHex(mappedUid) + statusCode, 'hex');
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, statusBuffer, socket.id);

            if (true) { // Always send for testing
                
                logger.debug('Login buddy status sent', {
                    userId: user.uid,
                    buddyUid: buddy.uid,
                    buddyNickname: buddy.nickname,
                    statusCode,
                    status: statusCode === '0000001E' ? 'online' : 'away'
                });
            } else {
                logger.debug('Skipping offline buddy status', {
                    userId: user.uid,
                    buddyUid: buddy.uid,
                    buddyNickname: buddy.nickname,
                    reason: 'buddy is offline'
                });
            }
        });
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

    createRoomListBuffer(categoryId, user = null) {
        const buffers = [];
        const delimiter = Buffer.from([0xC8]);
        
        buffers.push(Buffer.from(`catg=${categoryId}\n`));
        buffers.push(delimiter);

        // Pass user context to getRoomsByCategory to filter out closed rooms
        const rooms = serverState.getRoomsByCategory(categoryId, user);
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

        // Determine room type based on room properties and user admin status
        if (room.isPrivate && room.isVoice && room.video) {
            // Private video conference
            roomType = ROOM_TYPE_CODES.PRIVATE_VIDEO;
        } else if (room.isPrivate && room.isVoice) {
            // Private voice conference
            roomType = ROOM_TYPE_CODES.PRIVATE_VOICE;
        } else if (room.isPrivate && !room.isVoice) {
            // Private text
            roomType = ROOM_TYPE_CODES.PRIVATE_TEXT;
        } else if (!room.isPrivate && room.video) {
            // Public video conference
            roomType = ROOM_TYPE_CODES.VIDEO_CONFERENCE;
        } else if (!room.isPrivate && room.isVoice) {
            // Public voice - use admin version if user is admin
            roomType = isAdmin ? ROOM_TYPE_CODES.VOICE_ADMIN : ROOM_TYPE_CODES.VOICE_NORMAL;
        } else {
            // Public text - use admin version if user is admin
            roomType = isAdmin ? ROOM_TYPE_CODES.TEXT_ADMIN : ROOM_TYPE_CODES.TEXT_NORMAL;
        }

        // CRITICAL FIX: Always reload topic from database before sending room join data
        // This ensures users always get the most current topic, not the stale in-memory version
        if (room.isPermanent && room.serverState && room.serverState.databaseManager) {
            try {
                logger.info('Reloading room topic from database before join', {
                    roomId: room.id,
                    roomName: room.name,
                    currentInMemoryTopic: room.topic,
                    userId: user.uid,
                    userNickname: user.nickname
                });
                
                const updatedRoomData = await room.serverState.databaseManager.getRoomById(room.id);
                
                logger.info('Database room data retrieved', {
                    roomId: room.id,
                    foundRoomData: !!updatedRoomData,
                    databaseTopic: updatedRoomData ? updatedRoomData.topic : 'NO_DATA',
                    databaseTopicHex: updatedRoomData && updatedRoomData.topic ? Buffer.from(updatedRoomData.topic).toString('hex') : 'NO_DATA',
                    topicType: updatedRoomData ? typeof updatedRoomData.topic : 'undefined'
                });
                
                if (updatedRoomData && updatedRoomData.topic !== undefined && updatedRoomData.topic !== null) {
                    const oldTopic = room.topic;
                    room.topic = updatedRoomData.topic;
                    
                    logger.info('Room topic successfully reloaded from database', {
                        roomId: room.id,
                        roomName: room.name,
                        oldTopic: oldTopic.substring(0, 100),
                        newTopic: room.topic.substring(0, 100),
                        oldTopicHex: Buffer.from(oldTopic).toString('hex'),
                        newTopicHex: Buffer.from(room.topic).toString('hex'),
                        topicsMatch: oldTopic === room.topic,
                        userId: user.uid,
                        userNickname: user.nickname
                    });
                } else {
                    logger.warn('Failed to reload topic from database', {
                        roomId: room.id,
                        roomName: room.name,
                        updatedRoomDataExists: !!updatedRoomData,
                        topicField: updatedRoomData ? updatedRoomData.topic : 'NO_ROOM_DATA'
                    });
                }
            } catch (error) {
                logger.error('Critical error reloading room topic from database', error, {
                    roomId: room.id,
                    roomName: room.name,
                    userId: user.uid,
                    errorMessage: error.message,
                    errorStack: error.stack
                });
                // Continue with existing topic if reload fails
            }
        } else {
            logger.info('Skipping database topic reload', {
                roomId: room.id,
                roomName: room.name,
                isPermanent: room.isPermanent,
                hasServerState: !!room.serverState,
                hasDatabaseManager: !!(room.serverState && room.serverState.databaseManager),
                currentTopic: room.topic.substring(0, 100),
                userId: user.uid
            });
        }

        logger.debug('Room join data preparation', {
            roomId: room.id,
            roomName: room.name,
            isVoice: room.isVoice,
            isAdmin,
            roomType,
            userId: user.uid,
            nickname: user.nickname,
            finalTopic: room.topic.substring(0, 50)
        });

        const roomDetails = Utils.objectToKeyValueString(room.getRoomDetails());
        const joinBuffer = Buffer.from(
            roomIdHex + roomType + '000000000' + '0b54042a' + '0010006' + '0003' + '47' + 
            Utils.asciiToHex(room.name) + roomDetails,
            'hex'
        );

        sendPacket(socket, 0x0136, joinBuffer, socket.id);

        // Send admin granted packet if user is joining as admin
        if (isAdmin) {
            const adminGrantedBuffer = Buffer.from(roomIdHex, 'hex');
            sendPacket(socket, PACKET_TYPES.ROOM_ADMIN_GRANTED, adminGrantedBuffer, socket.id);

            logger.debug('Sent admin granted packet', {
                roomId: room.id,
                roomName: room.name,
                userId: user.uid,
                nickname: user.nickname,
                packetType: '0x0370',
                payload: roomIdHex
            });
        }

        // Send welcome messages
        this.sendRoomMessage(socket, room.id, room.getWelcomeMessage());
        this.sendRoomMessage(socket, room.id, `${user.nickname}, welcome to the room ${room.name}.`);
        
        // Send topic (now guaranteed to be the latest from database)
        logger.info('Sending room topic to user', {
            roomId: room.id,
            roomName: room.name,
            userId: user.uid,
            userNickname: user.nickname,
            topicBeingSent: room.topic,
            topicLength: room.topic.length,
            topicHex: Buffer.from(room.topic).toString('hex'),
            roomIdHex: roomIdHex
        });
        
        const topicBuffer = Buffer.concat([
            Buffer.from(roomIdHex, 'hex'),
            Buffer.from('00000000', 'hex'),
            Buffer.from(room.topic, 'utf8')
        ]);
        
        logger.info('Topic buffer created', {
            roomId: room.id,
            userId: user.uid,
            bufferHex: topicBuffer.toString('hex'),
            bufferLength: topicBuffer.length,
            expectedHex: roomIdHex + '00000000' + Buffer.from(room.topic).toString('hex')
        });
        
        sendPacket(socket, PACKET_TYPES.ROOM_TOPIC, topicBuffer, socket.id);

        // Send status message if it exists (this is what admins can change)
        if (room.statusMessage && room.statusMessage.trim()) {
            const statusBuffer = Buffer.concat([
                Buffer.from(roomIdHex, 'hex'),
                Buffer.from('00000000', 'hex'),
                Buffer.from(room.statusMessage, 'utf8')
            ]);
            sendPacket(socket, PACKET_TYPES.ROOM_TOPIC, statusBuffer, socket.id);
        }

        // Send user list
        this.sendUserList(socket, room);

        // Send voice server info if voice room
        if (room.isVoice) {
            const mediaServerIp = SERVER_CONFIG.VOICE_SERVER_IP;
            logger.debug('Voice server IP configuration', {
                mediaServerIp,
                envVoiceServerIp: process.env.VOICE_SERVER_IP,
                serverIp: SERVER_CONFIG.SERVER_IP,
                roomId: room.id,
                voicePort: SERVER_CONFIG.VOICE_PORT
            });
            
            if (!mediaServerIp) {
                logger.error('Voice server IP not configured', {
                    roomId: room.id,
                    mediaServerIp,
                    envVoiceServerIp: process.env.VOICE_SERVER_IP
                });
                return;
            }
            
            const ipHex = Utils.ipToHex(mediaServerIp);
            const voicePortHex = Utils.decToHex(SERVER_CONFIG.VOICE_PORT, 2); // 2090 -> 082a
            
            // ROOM_MEDIA_SERVER packet format:
            // Room ID (4 bytes) + IP (4 bytes) + Unknown1 (4 bytes) + Unknown2 (2 bytes) + Voice Port (2 bytes)
            const voiceBuffer = Buffer.concat([
                Buffer.from(roomIdHex, 'hex'),        // Room ID
                Buffer.from(ipHex, 'hex'),            // Voice server IP
                Buffer.from('0001869f', 'hex'),       // Unknown data (protocol specific)
                Buffer.from('0000', 'hex'),           // Unknown data
                Buffer.from(voicePortHex, 'hex')      // Voice server port
            ]);
            
            logger.info('Sending ROOM_MEDIA_SERVER packet', {
                roomId: room.id,
                roomIdHex,
                mediaServerIp,
                ipHex,
                voicePort: SERVER_CONFIG.VOICE_PORT,
                voicePortHex,
                bufferHex: voiceBuffer.toString('hex'),
                module: 'voice'
            });
            
            sendPacket(socket, PACKET_TYPES.ROOM_MEDIA_SERVER, voiceBuffer, socket.id);
            
            // Notify voice server about user joining voice room
            // This allows the voice server to associate the upcoming voice connection with this user
            if (this.mediaServer) {
                setTimeout(() => {
                    // Look for a voice connection from this user's IP in this room
                    const connectionId = this.mediaServer.findConnectionByRoomAndAddress(
                        room.id, 
                        socket.remoteAddress
                    );
                    if (connectionId) {
                        this.mediaServer.associateUserWithConnection(connectionId, user.uid);
                        logger.info('Associated voice connection with user', {
                            connectionId,
                            userId: user.uid,
                            roomId: room.id,
                            module: 'voice'
                        });
                    }
                }, 1000); // Give the voice client time to connect
            }
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
        // FIXED: Use proper buffer concatenation instead of hex encoding to prevent reconnections
        const messageBuffer = Buffer.concat([
            Buffer.from(Utils.decToHex(roomId), 'hex'),
            Buffer.from('00000000', 'hex'),
            Buffer.from(message, 'utf8')
        ]);
        sendPacket(socket, 0x015e, messageBuffer, socket.id);
    }

    sendUserList(socket, room) {
        const buffers = [];
        const delimiter = Buffer.from([0xC8]);

        const visibleUsers = room.getVisibleUsers();
        logger.info('Sending user list', {
            roomId: room.id,
            userCount: visibleUsers.length,
            users: visibleUsers.map(u => ({ uid: u.uid, nickname: u.nickname, admin: u.admin, isRoomAdmin: u.isRoomAdmin }))
        });

        visibleUsers.forEach(user => {
            // Check if user is red dotted - if so, force mic=0 regardless of their actual mic permission
            const effectiveMic = room.canUserUseVoice(user.uid) ? user.mic : 0;
            const userString = `group_id=${room.id}\nuid=${user.uid}\nnickname=${user.nickname}\nadmin=${user.admin}\ncolor=${user.color}\nmic=${effectiveMic}\npub=${user.pub}\naway=${user.away}`;
            buffers.push(Buffer.from(userString));
            buffers.push(delimiter);
        });

        // Add proper end-of-list marker
        if (buffers.length > 0) {
            const userListBuffer = Buffer.concat(buffers);
            sendPacket(socket, 0x0154, userListBuffer, socket.id);
        } else {
            // Send empty user list if no users
            sendPacket(socket, 0x0154, Buffer.alloc(0), socket.id);
        }
    }

    broadcastUserListUpdate(room) {
        logger.info('Broadcasting user list update', {
            roomId: room.id,
            roomName: room.name,
            userCount: room.getAllUsers().length,
            usersWithSockets: room.getAllUsers().filter(u => {
                const user = serverState.getUser(u.uid);
                return user && user.socket;
            }).length
        });
        
        const allUsers = room.getAllUsers();
        let successCount = 0;
        let failCount = 0;
        
        allUsers.forEach(roomUserData => {
            const user = serverState.getUser(roomUserData.uid);
            if (user && user.socket) {
                try {
                    this.sendUserList(user.socket, room);
                    successCount++;
                } catch (error) {
                    logger.error('Failed to send user list to user', error, {
                        userId: user.uid,
                        nickname: user.nickname,
                        roomId: room.id
                    });
                    failCount++;
                }
            } else {
                failCount++;
                logger.warn('User missing or no socket for user list update', {
                    uid: roomUserData.uid,
                    userExists: !!user,
                    hasSocket: user ? !!user.socket : false
                });
            }
        });
        
        logger.info('User list update broadcast completed', {
            roomId: room.id,
            successCount,
            failCount,
            totalUsers: allUsers.length
        });
    }

    broadcastUserLeft(room, uid, nickname) {
        logger.info('Broadcasting user left notification', {
            roomId: room.id,
            roomName: room.name,
            leftUserUid: uid,
            leftUserNickname: nickname
        });
        
        // Create user left notification packet (0x0140)
        // Use the same format as ROOM_USER_LEFT packet - just room ID and user ID
        const userLeftBuffer = Buffer.alloc(8);
        userLeftBuffer.writeUInt32BE(room.id, 0);  // Room ID as 4-byte big-endian
        userLeftBuffer.writeUInt32BE(uid, 4);      // User ID as 4-byte big-endian
        
        // Send to all users in the room except the one who left
        room.getAllUsers().forEach(roomUserData => {
            if (roomUserData.uid !== uid) {
                const user = serverState.getUser(roomUserData.uid);
                if (user && user.socket) {
                    sendPacket(user.socket, 0x0140, userLeftBuffer, user.socket.id);
                }
            }
        });
    }

    broadcastToRoom(room, packetType, payload, excludeSocket = null) {
        const allUsers = room.getAllUsers();
        logger.debug('Broadcasting to room', {
            roomId: room.id,
            roomName: room.name,
            packetType: `0x${packetType.toString(16)}`,
            userCount: allUsers.length,
            excludeSocketId: excludeSocket?.id
        });

        let successCount = 0;
        let failCount = 0;

        allUsers.forEach(roomUserData => {
            const user = serverState.getUser(roomUserData.uid);
            if (!user) {
                logger.warn('User not found in serverState during broadcast', {
                    uid: roomUserData.uid,
                    roomId: room.id
                });
                failCount++;
                return;
            }

            if (!user.socket) {
                logger.warn('User has no socket during broadcast', {
                    uid: user.uid,
                    nickname: user.nickname,
                    roomId: room.id
                });
                failCount++;
                return;
            }

            if (user.socket === excludeSocket) {
                logger.debug('Excluding sender from broadcast', {
                    uid: user.uid,
                    nickname: user.nickname,
                    roomId: room.id
                });
                return;
            }

            try {
                sendPacket(user.socket, packetType, payload, user.socket.id);
                successCount++;
            } catch (error) {
                logger.error('Failed to send packet during broadcast', error, {
                    uid: user.uid,
                    nickname: user.nickname,
                    roomId: room.id,
                    packetType: `0x${packetType.toString(16)}`
                });
                failCount++;
            }
        });

        logger.debug('Broadcast completed', {
            roomId: room.id,
            roomName: room.name,
            packetType: `0x${packetType.toString(16)}`,
            successCount,
            failCount,
            totalUsers: allUsers.length
        });
    }

    broadcastStatusChange(user, mode) {
        let statusCode;
        switch(mode) {
            case USER_MODES.OFFLINE:
                statusCode = '00000000';
                break;
            case USER_MODES.AWAY:
                statusCode = '00000046';
                break;
            case USER_MODES.ONLINE:
            default:
                statusCode = '0000001E';
                break;
        }
        
        const statusBuffer = Buffer.from(Utils.decToHex(user.uid) + statusCode, 'hex');

        serverState.getOnlineUsers().forEach(onlineUser => {
            if (onlineUser.hasBuddy(user.uid) && onlineUser.socket) {
                sendPacket(onlineUser.socket, PACKET_TYPES.STATUS_CHANGE, statusBuffer, onlineUser.socket.id);
                
                logger.debug('Status change broadcast', {
                    userUid: user.uid,
                    userNickname: user.nickname,
                    mode,
                    statusCode,
                    status: mode === USER_MODES.OFFLINE ? 'offline' : mode === USER_MODES.AWAY ? 'away' : 'online',
                    sentToUid: onlineUser.uid,
                    sentToNickname: onlineUser.nickname
                });
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
     * Clean up old message history to prevent memory leaks
     */
    cleanupMessageHistory() {
        const now = Date.now();
        const cutoffTime = now - this.spamCheckWindow;
        
        for (const [userId, messages] of this.recentMessages.entries()) {
            // Filter out old messages
            const recentMessages = messages.filter(msg => msg.timestamp > cutoffTime);
            
            if (recentMessages.length === 0) {
                // Remove user entirely if no recent messages
                this.recentMessages.delete(userId);
            } else if (recentMessages.length !== messages.length) {
                // Update with filtered messages
                this.recentMessages.set(userId, recentMessages);
            }
        }
        
        logger.debug('Cleaned up message history', {
            totalUsers: this.recentMessages.size,
            cutoffTime: new Date(cutoffTime).toISOString()
        });
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
            roomName: targetRoom.name,
            roomIsClosed: targetRoom.isClosed
        });

        // CRITICAL FIX: If room is closed, reopen it when admin joins
        if (targetRoom.isClosed) {
            logger.info('Admin joining closed room via "Join as Admin" - reopening automatically', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: targetRoom.id,
                roomName: targetRoom.name,
                targetUid: targetUid,
                targetNickname: targetUser.nickname,
                roomClosedStateBefore: targetRoom.isClosed
            });
            
            await targetRoom.reopenRoom(user.uid);
            
            // Verify the room was actually reopened
            logger.info('Room reopening completed via "Join as Admin" - verification', {
                roomId: targetRoom.id,
                roomName: targetRoom.name,
                closedStateAfter: targetRoom.isClosed,
                reopenSuccessful: !targetRoom.isClosed
            });
        }

        // For multiple room support, users can join additional rooms as admin
        // without leaving their current rooms (unless they choose to)        // Join the target room as admin (4th parameter = true, like original joinRoom call)
        if (targetRoom.addUser(user, true, true)) { // visible=true, isAdmin=true
            await this.sendRoomJoinData(socket, targetRoom, user, true);
            
            // *** REAL-TIME BROADCAST: Notify other users that admin joined ***
            const userJoinedData = Buffer.from(
                Utils.decToHex(targetRoom.id) + Utils.decToHex(user.uid),
                'hex'
            );
            
            this.broadcastToRoom(targetRoom, PACKET_TYPES.ROOM_USER_JOINED, userJoinedData, user.socket);
            
            // *** REAL-TIME BROADCAST: Send updated user lists to everyone ***
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
        
        sendPacket(socket, PACKET_TYPES.PACKET_ROOM_ADMIN_INFO, Buffer.from(adminInfo), socket.id);
    }

    /**
     * Handle room invite packet
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleEcho(socket, payload) {
        // Handle ECHO packet - server sends ECHO (0x0837), client must respond with ECHO_RESPONSE (-2103)
        // Based on Gaim plugin: pt_send_packet(ptd,PACKET_ECHO_RESPONSE,waitbuf,waitlen);
        
        logger.debug('ECHO packet received', {
            socketId: socket.id,
            payloadLength: payload.length,
            payloadHex: payload.toString('hex'),
            module: 'packetProcessor'
        });

        try {
            // Send ECHO_RESPONSE back to client with the same payload
            sendPacket(socket, PACKET_TYPES.ECHO_RESPONSE, payload, socket.id);
            
            logger.debug('ECHO_RESPONSE sent', {
                socketId: socket.id,
                responseLength: payload.length,
                module: 'packetProcessor'
            });
            
        } catch (error) {
            logger.error('Failed to send ECHO_RESPONSE', error, {
                socketId: socket.id,
                module: 'packetProcessor'
            });
        }
    }

    async handleInviteOut(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) return;

        logger.debug('Invite packet received', {
            userId: user.uid,
            nickname: user.nickname,
            payloadHex: payload.toString('hex'),
            payloadLength: payload.length
        });

        // Parse the invite payload
        // Based on Gaim implementation: room ID (4 bytes) + target user ID (4 bytes)
        if (payload.length < 8) {
            logger.warn('Invalid invite packet - insufficient payload length', {
                userId: user.uid,
                payloadLength: payload.length,
                expectedMinLength: 8
            });
            return;
        }

        const roomId = Utils.hexToDec(payload.slice(0, 4));
        const targetUid = Utils.hexToDec(payload.slice(4, 8));

        logger.info('Processing room invite', {
            senderId: user.uid,
            senderNickname: user.nickname,
            roomId,
            targetUid
        });

        // Verify the room exists
        const room = serverState.getRoom(roomId);
        if (!room) {
            logger.warn('Invite sent for non-existent room', {
                senderId: user.uid,
                roomId,
                targetUid
            });
            return;
        }

        // Verify the inviter is in the room
        if (!room.hasUser(user.uid)) {
            logger.warn('User trying to invite to room they are not in', {
                senderId: user.uid,
                roomId: room.id,
                roomName: room.name,
                targetUid
            });
            return;
        }

        // Find the target user
        const targetUser = serverState.getUser(targetUid);
        if (!targetUser || !targetUser.isOnline()) {
            logger.warn('Invite sent to offline or non-existent user', {
                senderId: user.uid,
                roomId: room.id,
                targetUid,
                targetUserExists: !!targetUser,
                targetUserOnline: targetUser ? targetUser.isOnline() : false
            });
            return;
        }

        // Create invite message to send to target user
        // Format: sender ID (4 bytes) + room ID (4 bytes) + room name
        const inviteBuffer = Buffer.concat([
            Buffer.from(Utils.decToHex(user.uid), 'hex'),
            Buffer.from(Utils.decToHex(roomId), 'hex'),
            Buffer.from(room.name, 'utf8')
        ]);

        // Send invite to target user
        sendPacket(targetUser.socket, PACKET_TYPES.INVITE_IN, inviteBuffer, targetUser.socket.id);

        logger.info('Room invite sent successfully', {
            senderId: user.uid,
            senderNickname: user.nickname,
            targetUid,
            targetNickname: targetUser.nickname,
            roomId: room.id,
            roomName: room.name
        });

        // Optionally send confirmation back to sender
        // const confirmationMessage = `Invite sent to ${targetUser.nickname} for room ${room.name}`;
        // this.sendSystemMessage(socket, confirmationMessage);
    }

    /**
     * Handle user profile update packet (-65)
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleUserProfileUpdate(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) {
            logger.warn('Profile update from unauthenticated socket', { socketId: socket.id });
            return;
        }

        try {
            // Decode the payload as UTF-8 string containing key-value pairs
            const profileData = payload.toString('utf8');
            
            logger.info('User profile update received', {
                userId: user.uid,
                nickname: user.nickname,
                payloadLength: payload.length,
                rawData: profileData
            });

            // Parse the key-value pairs (format: key=value\nkey=value\n...)
            const profileFields = {};
            const lines = profileData.split('\n');
            
            for (const line of lines) {
                const [key, value] = line.split('=');
                if (key && value !== undefined) {
                    profileFields[key.trim()] = value.trim();
                }
            }

            logger.debug('Parsed profile fields', {
                userId: user.uid,
                nickname: user.nickname,
                parsedFields: profileFields
            });

            // Verify the UID matches the logged-in user for security
            if (profileFields.uid && parseInt(profileFields.uid) !== user.uid) {
                logger.warn('UID mismatch in profile update - potential security issue', {
                    packetUid: profileFields.uid,
                    userUid: user.uid,
                    socketId: socket.id
                });
                return;
            }

            // Map the profile fields to database fields
            const updateData = {};
            
            if (profileFields.first) {
                updateData.firstName = profileFields.first;
            }
            
            if (profileFields.last) {
                updateData.lastName = profileFields.last;
            }
            
            if (profileFields.nickname) {
                updateData.nickname = profileFields.nickname;
            }
            
            if (profileFields.email) {
                updateData.email = profileFields.email;
            }

            if (profileFields.get_offers_from_us) {
                updateData.getOffersFromUs = profileFields.get_offers_from_us;
            }

            if (profileFields.get_offers_from_affiliates) {
                updateData.getOffersFromAffiliates = profileFields.get_offers_from_affiliates;
            }

            if (profileFields.show_email) {
                updateData.showEmail = profileFields.show_email;
            }

            if (profileFields.show_first) {
                updateData.showFirst = profileFields.show_first;
            }

            if (profileFields.show_last) {
                updateData.showLast = profileFields.show_last;
            }

            // Update the database if we have any fields to update
            if (Object.keys(updateData).length > 0) {
                await this.db.updateUser(user.uid, updateData);
                
                // Update the user object in memory
                if (updateData.firstName) user.firstName = updateData.firstName;
                if (updateData.lastName) user.lastName = updateData.lastName;
                if (updateData.nickname) user.nickname = updateData.nickname;
                if (updateData.email) user.email = updateData.email;
                if (updateData.getOffersFromUs) user.getOffersFromUs = updateData.getOffersFromUs;
                if (updateData.getOffersFromAffiliates) user.getOffersFromAffiliates = updateData.getOffersFromAffiliates;
                if (updateData.showEmail) user.showEmail = updateData.showEmail;
                if (updateData.showFirst) user.showFirst = updateData.showFirst;
                if (updateData.showLast) user.showLast = updateData.showLast;

                logger.info('User profile updated successfully', {
                    userId: user.uid,
                    nickname: user.nickname,
                    updatedFields: Object.keys(updateData),
                    updateData
                });
            } else {
                logger.debug('No profile fields to update', {
                    userId: user.uid,
                    nickname: user.nickname,
                    receivedFields: Object.keys(profileFields)
                });
            }

        } catch (error) {
            logger.error('Error processing user profile update', error, {
                userId: user.uid,
                nickname: user.nickname,
                payloadLength: payload.length,
                payloadHex: payload.toString('hex')
            });
        }
    }

    /**
     * Send buddy status notification to all users who have this user on their buddy list
     * @param {Object} user - The user whose status changed
     * @param {boolean} isOnline - Whether the user is going online (true) or offline (false)
     */
    async sendBuddyStatusNotification(user, isOnline) {
        try {
            // Get all users who have this user on their buddy list
            const usersWithBuddy = await this.db.getUsersWithBuddy(user.uid);
            
            if (usersWithBuddy.length === 0) {
                logger.debug('No users have this user on their buddy list', { 
                    uid: user.uid, 
                    nickname: user.nickname 
                });
                return;
            }

            logger.info(`Notifying ${usersWithBuddy.length} users about buddy status change`, {
                buddyUid: user.uid,
                buddyNickname: user.nickname,
                isOnline,
                notifyingUsers: usersWithBuddy.map(u => u.nickname)
            });

            // Create the status notification packet
            const statusPacketType = isOnline ? PACKET_TYPES.BUDDY_ONLINE : PACKET_TYPES.BUDDY_OFFLINE;
            const statusBuffer = Buffer.alloc(12 + user.nickname.length);
            
            // Write buddy UID (4 bytes)
            statusBuffer.writeUInt32BE(user.uid, 0);
            
            // Write status (4 bytes) - 1 = online, 0 = offline
            statusBuffer.writeUInt32BE(isOnline ? 1 : 0, 4);
            
            // Write nickname length (4 bytes)
            statusBuffer.writeUInt32BE(user.nickname.length, 8);
            
            // Write nickname
            statusBuffer.write(user.nickname, 12, 'utf8');

            // Send notification to each user who has this buddy
            for (const userWithBuddy of usersWithBuddy) {
                const onlineBuddy = serverState.getUser(userWithBuddy.uid);
                if (onlineBuddy && onlineBuddy.socket) {
                    try {
                        sendPacket(onlineBuddy.socket, statusPacketType, statusBuffer, onlineBuddy.socket.id);
                        logger.debug('Sent buddy status notification', {
                            to: userWithBuddy.nickname,
                            toUid: userWithBuddy.uid,
                            buddy: user.nickname,
                            buddyUid: user.uid,
                            isOnline
                        });
                    } catch (sendError) {
                        logger.error('Failed to send buddy status notification', sendError, {
                            to: userWithBuddy.nickname,
                            buddy: user.nickname,
                            isOnline
                        });
                    }
                } else {
                    logger.debug('User not online to receive buddy notification', {
                        userUid: userWithBuddy.uid,
                        userNickname: userWithBuddy.nickname,
                        buddy: user.nickname
                    });
                }
            }

        } catch (error) {
            logger.error('Error sending buddy status notifications', error, {
                userUid: user.uid,
                userNickname: user.nickname,
                isOnline
            });
        }
    }

    /**
     * Handle REQUEST_STATUS packet (-68)
     * Client requests the current status of a specific user (usually after receiving IM from non-buddy)
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleRequestStatus(socket, payload) {
        const user = serverState.getUserBySocketId(socket.id);
        if (!user) {
            logger.warn('REQUEST_STATUS: No user found for socket', { socketId: socket.id });
            return;
        }

        if (payload.length < 4) {
            logger.warn('REQUEST_STATUS: Invalid payload length', {
                userId: user.uid,
                nickname: user.nickname,
                payloadLength: payload.length,
                expectedMinLength: 4
            });
            return;
        }

        // Extract the target user UID from the first 4 bytes of payload
        const targetUid = Utils.hexToDec(payload.slice(0, 4));
        
        logger.debug('REQUEST_STATUS packet received - checking user status', {
            requestingUser: user.uid,
            requestingUserNickname: user.nickname,
            targetUid: targetUid,
            payloadHex: payload.toString('hex')
        });

        // Find the target user and determine their status
        const targetUser = serverState.getUser(targetUid);
        let status = 'offline';
        let statusCode = '00000000'; // Default to offline
        
        if (targetUser && targetUser.isOnline()) {
            if (targetUser.mode === USER_MODES.AWAY) {
                status = 'away';
                statusCode = '00000046'; // Away status code
            } else {
                status = 'online';
                statusCode = '0000001E'; // Online status code
            }
        }
        
        // Send text-based response with packet type 68 (positive REQUEST_STATUS response)
        // Format: uid=X\nnickname=Y\nstatus=Z
        const targetNickname = targetUser ? targetUser.nickname : 'Unknown';
        const responseText = `uid=${targetUid}\nnickname=${targetNickname}`;
        const responseBuffer = Buffer.from(responseText, 'utf8');
        
        sendPacket(socket, 68, responseBuffer, socket.id);
        
        // ADDITIONAL: Send STATUS_CHANGE packet to update visual status display
        // This mirrors what happens when adding a buddy - sends the proper status notification
        const statusBuffer = Buffer.from(Utils.decToHex(targetUid) + statusCode, 'hex');
        sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, statusBuffer, socket.id);
        
        logger.info('REQUEST_STATUS: Sent dual response (text + status change)', {
            requestingUser: user.uid,
            requestingUserNickname: user.nickname,
            targetUid: targetUid,
            targetNickname: targetNickname,
            status: status,
            statusCode: statusCode,
            responseText: responseText
        });
    }

    // Helper methods

    /**
     * Send individual STATUS_CHANGE packets for each buddy during login
     * This is required for the client's buddy list UI to show correct status
     */
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

    createRoomListBuffer(categoryId, user = null) {
        const buffers = [];
        const delimiter = Buffer.from([0xC8]);
        
        buffers.push(Buffer.from(`catg=${categoryId}\n`));
        buffers.push(delimiter);

        // Pass user context to getRoomsByCategory to filter out closed rooms
        const rooms = serverState.getRoomsByCategory(categoryId, user);
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

    /**
     * Handle camera publishing start request
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleRoomStartPublishVideo(socket, payload) {
        try {
            const user = serverState.getUserBySocketId(socket.id);
            if (!user) {
                logger.warn('ROOM_START_PUBLISH_VIDEO: User not found', { socketId: socket.id });
                return;
            }

            const room = serverState.getRoom(user.currentRoom);
            if (!room) {
                logger.warn('ROOM_START_PUBLISH_VIDEO: User not in room', { 
                    userId: user.uid, 
                    nickname: user.nickname 
                });
                return;
            }

            logger.info('📹 User started publishing video', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                roomName: room.name,
                payloadHex: payload.toString('hex'),
                userHasSocket: !!user.socket,
                userSocketId: user.socket ? user.socket.id : null,
                currentSocketId: socket.id
            });

            // Update user's video publishing status
            user.pub = 'y';
            
            // Create ROOM_TRANSMITTING_VIDEO packet
            const responseBuffer = Buffer.alloc(16);
            responseBuffer.writeInt32LE(room.id, 6);  // Room ID at bytes 6-9
            responseBuffer.writeInt32LE(user.uid, 10); // User UIN at bytes 10-13
            responseBuffer.writeInt16LE(2, 14);       // Status = 2 (video transmitting)

            // Broadcast to all users in the room
            const roomMembers = room.getAllUsers();
            logger.info('📹 Debug: Got room members for broadcast', {
                roomId: room.id,
                roomName: room.name,
                roomMembersCount: roomMembers.length,
                roomMembersArray: roomMembers.map(m => ({
                    uid: m.user ? m.user.uid : m.uid,
                    nickname: m.user ? m.user.nickname : m.nickname,
                    hasSocket: m.user ? !!m.user.socket : !!m.socket,
                    isUserObject: !!m.user
                }))
            });
            
            let notificationsSent = 0;
            roomMembers.forEach(memberData => {
                // Extract the actual user object from userRoomData
                const member = memberData.user || memberData;
                
                // Get the user's current socket from serverState (more reliable than user.socket)
                const memberUser = serverState.getUser(member.uid);
                const memberSocket = memberUser ? memberUser.socket : null;
                
                logger.info('📹 Checking room member for video notification', {
                    memberUid: member.uid,
                    memberNickname: member.nickname,
                    hasSocket: !!memberSocket,
                    socketId: memberSocket ? memberSocket.id : null,
                    memberUserFound: !!memberUser
                });
                
                if (memberSocket) {
                    logger.debug('📹 Sending video notification to user', {
                        toUserId: member.uid,
                        toNickname: member.nickname,
                        packetType: PACKET_TYPES.ROOM_TRANSMITTING_VIDEO,
                        packetTypeHex: '0x' + PACKET_TYPES.ROOM_TRANSMITTING_VIDEO.toString(16),
                        responseBufferHex: responseBuffer.toString('hex')
                    });
                    sendPacket(memberSocket, PACKET_TYPES.ROOM_TRANSMITTING_VIDEO, responseBuffer, memberSocket.id);
                    notificationsSent++;
                } else {
                    logger.warn('📹 Room member has no socket, skipping notification', {
                        memberUid: member.uid,
                        memberNickname: member.nickname
                    });
                }
            });

            logger.info('📹 Video publishing notification sent', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                totalRoomMembers: roomMembers.length,
                notificationsSent: notificationsSent,
                packetType: PACKET_TYPES.ROOM_TRANSMITTING_VIDEO,
                packetTypeHex: '0x' + PACKET_TYPES.ROOM_TRANSMITTING_VIDEO.toString(16),
                responseBufferHex: responseBuffer.toString('hex')
            });

            // Broadcast updated user list to show video publishing status
            await this.broadcastUserListUpdate(room);
            
            logger.info('📹 User list updated for video publishing', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                pubStatus: user.pub
            });

        } catch (error) {
            logger.error('Error handling ROOM_START_PUBLISH_VIDEO', error, {
                socketId: socket.id,
                payloadLength: payload.length,
                payloadHex: payload.toString('hex')
            });
        }
    }

    /**
     * Handle camera publishing stop request
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleRoomStopPublishVideo(socket, payload) {
        try {
            const user = serverState.getUserBySocketId(socket.id);
            if (!user) {
                logger.warn('ROOM_STOP_PUBLISH_VIDEO: User not found', { socketId: socket.id });
                return;
            }

            const room = serverState.getRoom(user.currentRoom);
            if (!room) {
                logger.warn('ROOM_STOP_PUBLISH_VIDEO: User not in room', { 
                    userId: user.uid, 
                    nickname: user.nickname 
                });
                return;
            }

            logger.info('📹 User stopped publishing video', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                roomName: room.name,
                payloadHex: payload.toString('hex')
            });

            // Update user's video publishing status
            user.pub = 'n';
            
            // Create ROOM_TRANSMITTING_VIDEO packet (status 0 = stopped)
            const responseBuffer = Buffer.alloc(16);
            responseBuffer.writeInt32LE(room.id, 6);  // Room ID at bytes 6-9
            responseBuffer.writeInt32LE(user.uid, 10); // User UIN at bytes 10-13
            responseBuffer.writeInt16LE(0, 14);       // Status = 0 (video stopped)

            // Broadcast to all users in the room
            const roomMembers = room.getAllUsers();
            let notificationsSent = 0;
            roomMembers.forEach(memberData => {
                // Extract the actual user object from userRoomData
                const member = memberData.user || memberData;
                
                // Get the user's current socket from serverState (more reliable than user.socket)
                const memberUser = serverState.getUser(member.uid);
                const memberSocket = memberUser ? memberUser.socket : null;
                
                if (memberSocket) {
                    logger.debug('📹 Sending video stop notification to user', {
                        toUserId: member.uid,
                        toNickname: member.nickname,
                        packetType: PACKET_TYPES.ROOM_TRANSMITTING_VIDEO,
                        packetTypeHex: '0x' + PACKET_TYPES.ROOM_TRANSMITTING_VIDEO.toString(16),
                        responseBufferHex: responseBuffer.toString('hex')
                    });
                    sendPacket(memberSocket, PACKET_TYPES.ROOM_TRANSMITTING_VIDEO, responseBuffer, memberSocket.id);
                    notificationsSent++;
                }
            });

            logger.info('📹 Video stop notification sent', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                totalRoomMembers: roomMembers.length,
                notificationsSent: notificationsSent,
                packetType: PACKET_TYPES.ROOM_TRANSMITTING_VIDEO,
                packetTypeHex: '0x' + PACKET_TYPES.ROOM_TRANSMITTING_VIDEO.toString(16),
                responseBufferHex: responseBuffer.toString('hex')
            });

            // Broadcast updated user list to show video publishing status
            await this.broadcastUserListUpdate(room);
            
            logger.info('📹 User list updated for video stop', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                pubStatus: user.pub
            });

        } catch (error) {
            logger.error('Error handling ROOM_STOP_PUBLISH_VIDEO', error, {
                socketId: socket.id,
                payloadLength: payload.length,
                payloadHex: payload.toString('hex')
            });
        }
    }

    /**
     * Handle room bounce user request
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleRoomBounceUser(socket, payload) {
        try {
            const adminUser = serverState.getUserBySocketId(socket.id);
            if (!adminUser) {
                logger.warn('ROOM_BOUNCE_USER: Admin user not found', { socketId: socket.id });
                return;
            }

            // Parse payload: 4 bytes room ID + 4 bytes target user ID
            if (payload.length < 8) {
                logger.warn('ROOM_BOUNCE_USER: Invalid payload length', { 
                    expectedLength: 8, 
                    actualLength: payload.length,
                    payloadHex: payload.toString('hex')
                });
                return;
            }

            const roomId = payload.readUInt32BE(0);
            const targetUserId = payload.readUInt32BE(4);

            const room = serverState.getRoom(roomId);
            if (!room) {
                logger.warn('ROOM_BOUNCE_USER: Room not found', { 
                    roomId, 
                    adminUserId: adminUser.uid,
                    adminNickname: adminUser.nickname 
                });
                return;
            }

            const targetUser = serverState.getUser(targetUserId);
            if (!targetUser) {
                logger.warn('ROOM_BOUNCE_USER: Target user not found', { 
                    targetUserId, 
                    roomId,
                    adminUserId: adminUser.uid 
                });
                return;
            }

            // Check if admin has permission to bounce users
            const adminRoomData = room.getUser(adminUser.uid);
            if (!adminRoomData || !adminRoomData.admin) {
                logger.warn('ROOM_BOUNCE_USER: Admin lacks permission', { 
                    adminUserId: adminUser.uid,
                    adminNickname: adminUser.nickname,
                    roomId,
                    isAdmin: adminRoomData ? adminRoomData.admin : false
                });
                return;
            }

            logger.info('🚪 Admin bouncing user from room', {
                adminUserId: adminUser.uid,
                adminNickname: adminUser.nickname,
                targetUserId: targetUser.uid,
                targetNickname: targetUser.nickname,
                roomId: room.id,
                roomName: room.name
            });

            // Execute the bounce (without reason)
            await this.executeBounce(room, adminUser, targetUser, null);

        } catch (error) {
            logger.error('Error handling ROOM_BOUNCE_USER', error, {
                socketId: socket.id,
                payloadLength: payload.length,
                payloadHex: payload.toString('hex')
            });
        }
    }

    /**
     * Handle room bounce with reason request
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleRoomBounceReason(socket, payload) {
        try {
            const adminUser = serverState.getUserBySocketId(socket.id);
            if (!adminUser) {
                logger.warn('ROOM_BOUNCE_REASON: Admin user not found', { socketId: socket.id });
                return;
            }

            // Parse payload based on Gaim: 2 bytes length + 4 bytes room + 4 bytes user + "BR: " + reason
            if (payload.length < 14) { // Minimum: 2 + 4 + 4 + "BR: " (4)
                logger.warn('ROOM_BOUNCE_REASON: Invalid payload length', { 
                    minExpectedLength: 14, 
                    actualLength: payload.length,
                    payloadHex: payload.toString('hex')
                });
                return;
            }

            // Skip the first 2 bytes (length field)
            const roomId = payload.readUInt32BE(2);
            const targetUserId = payload.readUInt32BE(6);
            
            // Extract reason text (starts at byte 10)
            const reasonText = payload.toString('utf8', 10);
            // Remove "BR: " prefix if present
            const reason = reasonText.startsWith('BR: ') ? reasonText.substring(4) : reasonText;

            logger.info('🚪 Bounce with reason request', {
                adminUserId: adminUser.uid,
                adminNickname: adminUser.nickname,
                targetUserId,
                roomId,
                reason,
                payloadHex: payload.toString('hex')
            });

            const room = serverState.getRoom(roomId);
            if (!room) {
                logger.warn('ROOM_BOUNCE_REASON: Room not found', { roomId });
                return;
            }

            const targetUser = serverState.getUser(targetUserId);
            if (!targetUser) {
                logger.warn('ROOM_BOUNCE_REASON: Target user not found', { targetUserId });
                return;
            }

            // Check admin permission
            const adminRoomData = room.getUser(adminUser.uid);
            if (!adminRoomData || !adminRoomData.admin) {
                logger.warn('ROOM_BOUNCE_REASON: Admin lacks permission', { 
                    adminUserId: adminUser.uid,
                    roomId
                });
                return;
            }

            // Execute the bounce with reason
            await this.executeBounce(room, adminUser, targetUser, reason);

        } catch (error) {
            logger.error('Error handling ROOM_BOUNCE_REASON', error, {
                socketId: socket.id,
                payloadLength: payload.length,
                payloadHex: payload.toString('hex')
            });
        }
    }

    /**
     * Execute the bounce action
     * @param {Room} room 
     * @param {User} adminUser 
     * @param {User} targetUser 
     * @param {string|null} reason 
     */
    async executeBounce(room, adminUser, targetUser, reason) {
        try {
            logger.info('🚪 Executing bounce', {
                adminUserId: adminUser.uid,
                adminNickname: adminUser.nickname,
                targetUserId: targetUser.uid,
                targetNickname: targetUser.nickname,
                roomId: room.id,
                roomName: room.name,
                reason: reason || 'No reason provided'
            });

            // Remove user from room
            if (room.removeUser(targetUser)) {
                // Log the bounce event to database
                try {
                    await this.db.logBounce(
                        adminUser.uid,
                        adminUser.nickname,
                        targetUser.uid,
                        targetUser.nickname,
                        room.id,
                        room.name,
                        reason
                    );
                } catch (dbError) {
                    logger.error('Failed to log bounce event to database', dbError, {
                        adminUserId: adminUser.uid,
                        targetUserId: targetUser.uid,
                        roomId: room.id,
                        reason
                    });
                }

                // Send ROOM_CLOSED to the bounced user with custom message
                // Format: Room ID (4 bytes) + message text (same as regular room close)
                const bounceMessage = 'You have been removed from this room by an admin';
                const closedPacket = Buffer.concat([
                    Buffer.from(Utils.decToHex(room.id), 'hex'),  // Room ID as 4-byte hex
                    Buffer.from(bounceMessage, 'utf8')            // Bounce message text
                ]);
                
                if (targetUser.socket) {
                    sendPacket(targetUser.socket, PACKET_TYPES.ROOM_CLOSED, closedPacket, targetUser.socket.id);
                    logger.info('🚪 Sent ROOM_CLOSED to bounced user', {
                        targetUserId: targetUser.uid,
                        targetNickname: targetUser.nickname,
                        roomId: room.id,
                        message: bounceMessage
                    });
                }

                // Broadcast user left notification to remaining room members
                const userLeftData = Buffer.alloc(8);
                userLeftData.writeUInt32BE(room.id, 0);
                userLeftData.writeUInt32BE(targetUser.uid, 4);
                this.broadcastToRoom(room, PACKET_TYPES.ROOM_USER_LEFT, userLeftData, targetUser.socket);

                // Update user list
                await this.broadcastUserListUpdate(room);

                logger.info('🚪 User bounced successfully', {
                    adminUserId: adminUser.uid,
                    targetUserId: targetUser.uid,
                    targetNickname: targetUser.nickname,
                    roomId: room.id,
                    reason: reason || 'No reason'
                });
            } else {
                logger.warn('🚪 Failed to remove user from room', {
                    targetUserId: targetUser.uid,
                    roomId: room.id
                });
            }
        } catch (error) {
            logger.error('Error executing bounce', error, {
                adminUserId: adminUser.uid,
                targetUserId: targetUser.uid,
                roomId: room.id
            });
        }
    }

    /**
     * Handle room get admin info request
     * @param {Socket} socket 
     * @param {Buffer} payload 
     */
    async handleRoomGetAdminInfo(socket, payload) {
        try {
            logger.info('🔧 handleRoomGetAdminInfo called', {
                socketId: socket.id,
                payloadLength: payload.length,
                payloadHex: payload.toString('hex')
            });
            
            const user = serverState.getUserBySocketId(socket.id);
            if (!user) {
                logger.warn('ROOM_GET_ADMIN_INFO: User not found', { socketId: socket.id });
                return;
            }

            // Parse payload: 4 bytes room ID
            if (payload.length < 4) {
                logger.warn('ROOM_GET_ADMIN_INFO: Invalid payload length', { 
                    expectedLength: 4, 
                    actualLength: payload.length,
                    payloadHex: payload.toString('hex')
                });
                return;
            }

            const roomId = payload.readUInt32BE(0);
            const room = serverState.getRoom(roomId);
            
            if (!room) {
                logger.warn('ROOM_GET_ADMIN_INFO: Room not found', { 
                    roomId, 
                    userId: user.uid,
                    nickname: user.nickname 
                });
                return;
            }

            // Check if user is admin in this room
            const userInRoom = room.getUser(user.uid);
            if (!userInRoom || !userInRoom.admin) {
                logger.warn('ROOM_GET_ADMIN_INFO: User is not admin', { 
                    userId: user.uid,
                    nickname: user.nickname,
                    roomId,
                    isAdmin: userInRoom ? userInRoom.admin : false
                });
                return;
            }

            logger.info('Sending room admin info', {
                userId: user.uid,
                nickname: user.nickname,
                roomId: room.id,
                roomName: room.name
            });

            // Send admin info response
            await this.sendRoomAdminInfo(socket, room);

        } catch (error) {
            logger.error('Error handling ROOM_GET_ADMIN_INFO', error, {
                socketId: socket.id,
                payloadLength: payload.length,
                payloadHex: payload.toString('hex')
            });
        }
    }

    /**
     * Send room admin info response
     * Format: group=<roomId>\nmike=<0|1>\ntext=<0|1>\nvideo=<0|1>\nbounce=<list>\nban=<list>
     * @param {Socket} socket
     * @param {Room} room
     */
    async sendRoomAdminInfo(socket, room) {
        try {
            // Get room settings from database
            const roomData = await this.db.getRoomById(room.id);

            // Get bounced users from room state
            // Format: uid,nickname separated by newlines
            const bouncedUsers = room.getBouncedUsers ? room.getBouncedUsers() : [];
            const bounceList = bouncedUsers.map(u => `${u.uid},${u.nickname}`).join('\n');

            // Get banned users from room state
            // Format: uid,nickname separated by newlines
            const bannedUsers = room.getBannedUsers ? room.getBannedUsers() : [];
            const banList = bannedUsers.map(u => `${u.uid},${u.nickname}`).join('\n');

            // Build admin info response
            // Format: group= mike= text= video= bounce= ban= (delimited by \n)
            const adminInfo = [
                `group=${room.id}`,
                `mike=${roomData?.mike ?? 1}`,
                `text=${roomData?.text ?? 0}`,
                `video=1`,  // Hardcoded to 1 for testing
                `bounce=${bounceList}`,
                `ban=${banList}`
            ].join('\n');

            const payloadBuffer = Buffer.from(adminInfo, 'utf8');

            // Get user info for logging
            const user = serverState.getUserBySocketId(socket.id);

            logger.info('Sending ROOM_ADMIN_INFO', {
                userId: user?.uid,
                nickname: user?.nickname,
                roomId: room.id,
                payloadLength: payloadBuffer.length,
                payload: adminInfo
            });

            sendPacket(socket, PACKET_TYPES.PACKET_ROOM_ADMIN_INFO, payloadBuffer, socket.id);

        } catch (error) {
            logger.error('Error sending room admin info', error, {
                roomId: room.id,
                socketId: socket.id
            });
        }
    }
}

module.exports = PacketProcessor;
