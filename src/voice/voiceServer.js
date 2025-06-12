/**
 * Enhanced voice server with room-based audio relay and better error handling
 */
const net = require('net');
const logger = require('../utils/logger');
const { SERVER_CONFIG } = require('../config/constants');

class VoiceServer {
    constructor() {
        this.server = null;
        this.connections = new Map(); // socketId -> connection info
        this.rooms = new Map(); // roomId -> Set of socketIds
        this.isRunning = false;
    }

    /**
     * Start the voice server
     */
    start() {
        return new Promise((resolve, reject) => {
            this.server = net.createServer(socket => {
                this.handleNewConnection(socket);
            });

            this.server.listen(SERVER_CONFIG.VOICE_PORT, () => {
                this.isRunning = true;
                logger.info('Voice server started', { 
                    port: SERVER_CONFIG.VOICE_PORT 
                });
                resolve();
            });

            this.server.on('error', (error) => {
                logger.error('Voice server error', error);
                if (!this.isRunning) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Handle new voice connection
     * @param {Socket} socket 
     */
    handleNewConnection(socket) {
        const connectionId = this.generateConnectionId();
        
        const connectionInfo = {
            id: connectionId,
            socket: socket,
            roomId: null,
            userId: null,
            isAuthenticated: false,
            bytesReceived: 0,
            bytesSent: 0,
            connectTime: new Date(),
            lastActivity: new Date()
        };

        this.connections.set(connectionId, connectionInfo);

        logger.info('Voice connection established', {
            connectionId,
            remoteAddress: socket.remoteAddress,
            remotePort: socket.remotePort,
            totalConnections: this.connections.size
        });

        socket.on('data', data => {
            this.handleVoiceData(connectionId, data);
        });

        socket.on('close', hadError => {
            this.handleConnectionClose(connectionId, hadError);
        });

        socket.on('error', error => {
            this.handleConnectionError(connectionId, error);
        });

        socket.on('end', () => {
            this.handleConnectionEnd(connectionId);
        });

        // Set socket timeout to prevent hanging connections
        socket.setTimeout(300000, () => { // 5 minutes
            logger.warn('Voice connection timeout', { connectionId });
            socket.destroy();
        });
    }

    /**
     * Handle incoming voice data
     * @param {string} connectionId 
     * @param {Buffer} data 
     */
    handleVoiceData(connectionId, data) {
        try {
            const connection = this.connections.get(connectionId);
            if (!connection) {
                logger.warn('Data received from unknown connection', { connectionId });
                return;
            }

            connection.lastActivity = new Date();
            connection.bytesReceived += data.length;

            // Check for authentication/room join packets
            const dataHex = data.toString('hex');
            
            // Handle special control packets
            if (this.isControlPacket(dataHex)) {
                this.handleControlPacket(connectionId, data);
                return;
            }

            // If not authenticated or not in a room, ignore audio data
            if (!connection.isAuthenticated || !connection.roomId) {
                logger.debug('Ignoring audio data from unauthenticated connection', {
                    connectionId,
                    isAuthenticated: connection.isAuthenticated,
                    roomId: connection.roomId
                });
                return;
            }

            // Process and relay audio data
            this.relayAudioData(connectionId, data);

        } catch (error) {
            logger.error('Error handling voice data', error, { connectionId });
        }
    }

    /**
     * Check if data is a control packet
     * @param {string} dataHex 
     * @returns {boolean}
     */
    isControlPacket(dataHex) {
        // Check for known control packet patterns
        return dataHex === '0000c353000f4242' || 
               dataHex === '0000c353000f4244' ||
               dataHex.startsWith('0000c353'); // Room join pattern
    }

    /**
     * Handle control packets (authentication, room join, etc.)
     * @param {string} connectionId 
     * @param {Buffer} data 
     */
    handleControlPacket(connectionId, data) {
        const connection = this.connections.get(connectionId);
        const dataHex = data.toString('hex');

        logger.debug('Control packet received', {
            connectionId,
            dataHex: dataHex.substring(0, 32) + (dataHex.length > 32 ? '...' : '')
        });

        // Handle authentication packets
        if (dataHex === '0000c353000f4242' || dataHex === '0000c353000f4244') {
            // Send acknowledgment
            connection.socket.write(Buffer.alloc(0));
            logger.debug('Authentication packet acknowledged', { connectionId });
            return;
        }

        // Handle room join packets (format: 0000c353 + roomId + userId)
        if (dataHex.startsWith('0000c353') && data.length >= 12) {
            const roomId = data.readUInt32BE(4);
            const userId = data.readUInt32BE(8);
            
            this.authenticateAndJoinRoom(connectionId, roomId, userId);
        }
    }

    /**
     * Authenticate connection and join room
     * @param {string} connectionId 
     * @param {number} roomId 
     * @param {number} userId 
     */
    authenticateAndJoinRoom(connectionId, roomId, userId) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        // Remove from previous room if any
        if (connection.roomId) {
            this.removeFromRoom(connectionId, connection.roomId);
        }

        // Join new room
        connection.roomId = roomId;
        connection.userId = userId;
        connection.isAuthenticated = true;

        // Add to room
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(connectionId);

        logger.info('Voice connection authenticated and joined room', {
            connectionId,
            roomId,
            userId,
            roomMemberCount: this.rooms.get(roomId).size
        });

        // Send join confirmation
        const confirmationBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
        connection.socket.write(confirmationBuffer);
    }

    /**
     * Relay audio data to other connections in the same room
     * @param {string} senderConnectionId 
     * @param {Buffer} audioData 
     */
    relayAudioData(senderConnectionId, audioData) {
        const senderConnection = this.connections.get(senderConnectionId);
        if (!senderConnection || !senderConnection.roomId) return;

        const roomId = senderConnection.roomId;
        const roomConnections = this.rooms.get(roomId);
        
        if (!roomConnections) return;

        // Parse RTP packet if possible
        let processedData = audioData;
        try {
            if (audioData.length >= 16) { // Minimum for length + RTP header
                const expectedLength = audioData.readUInt32BE(0);
                if (audioData.length >= expectedLength + 4) {
                    processedData = audioData.slice(4, 4 + expectedLength);
                    
                    // Log RTP packet info periodically
                    if (Math.random() < 0.01) { // 1% sampling for performance
                        const rtpInfo = this.parseRTPHeader(processedData);
                        logger.debug('RTP packet relayed', {
                            senderConnectionId,
                            roomId,
                            packetLength: processedData.length,
                            sequenceNumber: rtpInfo.sequenceNumber,
                            timestamp: rtpInfo.timestamp
                        });
                    }
                }
            }
        } catch (error) {
            logger.debug('Error parsing RTP packet, relaying raw data', { error: error.message });
        }

        // Relay to all other connections in the room
        let relayCount = 0;
        let errorCount = 0;

        roomConnections.forEach(connectionId => {
            if (connectionId !== senderConnectionId) {
                const targetConnection = this.connections.get(connectionId);
                if (targetConnection && targetConnection.socket.writable) {
                    try {
                        targetConnection.socket.write(processedData);
                        targetConnection.bytesSent += processedData.length;
                        relayCount++;
                    } catch (error) {
                        logger.debug('Failed to relay audio to connection', {
                            targetConnectionId: connectionId,
                            error: error.message
                        });
                        errorCount++;
                    }
                }
            }
        });

        // Update sender stats
        senderConnection.lastActivity = new Date();

        // Log relay statistics periodically
        if (Math.random() < 0.001) { // 0.1% sampling
            logger.debug('Audio relay statistics', {
                senderConnectionId,
                roomId,
                relayCount,
                errorCount,
                dataSize: processedData.length
            });
        }
    }

    /**
     * Parse RTP header for debugging/logging
     * @param {Buffer} packet 
     * @returns {Object}
     */
    parseRTPHeader(packet) {
        if (packet.length < 12) return {};

        try {
            const firstByte = packet.readUInt8(0);
            const version = (firstByte >> 6) & 0x03;
            const padding = (firstByte >> 5) & 0x01;
            const extension = (firstByte >> 4) & 0x01;
            const cc = firstByte & 0x0F;

            const secondByte = packet.readUInt8(1);
            const marker = (secondByte >> 7) & 0x01;
            const payloadType = secondByte & 0x7F;

            const sequenceNumber = packet.readUInt16BE(2);
            const timestamp = packet.readUInt32BE(4);
            const ssrc = packet.readUInt32BE(8);

            return {
                version,
                padding,
                extension,
                cc,
                marker,
                payloadType,
                sequenceNumber,
                timestamp,
                ssrc
            };
        } catch (error) {
            return {};
        }
    }

    /**
     * Remove connection from room
     * @param {string} connectionId 
     * @param {number} roomId 
     */
    removeFromRoom(connectionId, roomId) {
        const roomConnections = this.rooms.get(roomId);
        if (roomConnections) {
            roomConnections.delete(connectionId);
            
            // Clean up empty rooms
            if (roomConnections.size === 0) {
                this.rooms.delete(roomId);
                logger.debug('Empty voice room cleaned up', { roomId });
            }
        }
    }

    /**
     * Handle connection close
     * @param {string} connectionId 
     * @param {boolean} hadError 
     */
    handleConnectionClose(connectionId, hadError) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        logger.info('Voice connection closed', {
            connectionId,
            hadError,
            roomId: connection.roomId,
            userId: connection.userId,
            duration: Date.now() - connection.connectTime.getTime(),
            bytesReceived: connection.bytesReceived,
            bytesSent: connection.bytesSent
        });

        this.cleanupConnection(connectionId);
    }

    /**
     * Handle connection error
     * @param {string} connectionId 
     * @param {Error} error 
     */
    handleConnectionError(connectionId, error) {
        logger.error('Voice connection error', error, { connectionId });
        this.cleanupConnection(connectionId);
    }

    /**
     * Handle connection end
     * @param {string} connectionId 
     */
    handleConnectionEnd(connectionId) {
        logger.debug('Voice connection ended', { connectionId });
        this.cleanupConnection(connectionId);
    }

    /**
     * Clean up connection resources
     * @param {string} connectionId 
     */
    cleanupConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        // Remove from room
        if (connection.roomId) {
            this.removeFromRoom(connectionId, connection.roomId);
        }

        // Remove connection
        this.connections.delete(connectionId);

        logger.debug('Voice connection cleaned up', {
            connectionId,
            remainingConnections: this.connections.size,
            activeRooms: this.rooms.size
        });
    }

    /**
     * Generate unique connection ID
     * @returns {string}
     */
    generateConnectionId() {
        return 'voice_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    }

    /**
     * Get voice server statistics
     * @returns {Object}
     */
    getStats() {
        const stats = {
            isRunning: this.isRunning,
            totalConnections: this.connections.size,
            activeRooms: this.rooms.size,
            connections: [],
            rooms: []
        };

        // Connection details
        this.connections.forEach((connection, id) => {
            stats.connections.push({
                id,
                roomId: connection.roomId,
                userId: connection.userId,
                isAuthenticated: connection.isAuthenticated,
                bytesReceived: connection.bytesReceived,
                bytesSent: connection.bytesSent,
                connectTime: connection.connectTime,
                lastActivity: connection.lastActivity,
                remoteAddress: connection.socket.remoteAddress
            });
        });

        // Room details
        this.rooms.forEach((connections, roomId) => {
            stats.rooms.push({
                roomId,
                connectionCount: connections.size,
                connections: Array.from(connections)
            });
        });

        return stats;
    }

    /**
     * Perform cleanup of inactive connections
     */
    performCleanup() {
        const now = new Date();
        const timeoutMs = 300000; // 5 minutes
        let cleanedCount = 0;

        this.connections.forEach((connection, connectionId) => {
            const inactiveTime = now.getTime() - connection.lastActivity.getTime();
            
            if (inactiveTime > timeoutMs) {
                logger.info('Cleaning up inactive voice connection', {
                    connectionId,
                    inactiveTime,
                    roomId: connection.roomId
                });
                
                connection.socket.destroy();
                this.cleanupConnection(connectionId);
                cleanedCount++;
            }
        });

        if (cleanedCount > 0) {
            logger.info('Voice server cleanup completed', { cleanedCount });
        }
    }

    /**
     * Stop the voice server
     */
    async stop() {
        return new Promise((resolve) => {
            if (!this.server || !this.isRunning) {
                resolve();
                return;
            }

            // Close all connections
            this.connections.forEach((connection, connectionId) => {
                connection.socket.destroy();
            });

            this.server.close(() => {
                this.isRunning = false;
                this.connections.clear();
                this.rooms.clear();
                
                logger.info('Voice server stopped');
                resolve();
            });
        });
    }
}

module.exports = VoiceServer;
