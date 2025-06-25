/**
 * Enhanced voice server with room-based audio relay and better error handling
 */
const net = require('net');
const logger = require('../utils/logger');
const { SERVER_CONFIG, LOGGING_CONFIG } = require('../config/constants');

class VoiceServer {
    constructor() {
        this.server = null;
        this.connections = new Map(); // socketId -> connection info
        this.rooms = new Map(); // roomId -> Set of socketIds
        this.isRunning = false;
        this.stats = {
            serverStartTime: Date.now(),
            lastCleanup: Date.now(),
            totalPacketsRelayed: 0
        };
        
        // Rate limiting for log messages
        this.logRateLimiter = new Map(); // messageKey -> { count, firstSeen, lastLogged }
        
        // Server state reference for room validation
        this.serverState = null;
    }

    /**
     * Set the server state reference for room validation
     * @param {ServerState} serverState 
     */
    setServerState(serverState) {
        this.serverState = serverState;
    }

    /**
     * Start the voice server
     */
    start() {
        return new Promise((resolve, reject) => {
            this.server = net.createServer(socket => {
                this.handleNewConnection(socket);
            });

            this.server.listen(SERVER_CONFIG.VOICE_PORT, SERVER_CONFIG.SERVER_IP, () => {
                this.isRunning = true;
                logger.info('Voice server started', { 
                    ip: SERVER_CONFIG.SERVER_IP,
                    port: SERVER_CONFIG.VOICE_PORT,
                    module: 'voice'
                });
                resolve();
            });

            this.server.on('error', (error) => {
                logger.error('Voice server error', error, {
                    module: 'voice'
                });
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
            awaitingUserAssociation: false,
            bytesReceived: 0,
            bytesSent: 0,
            connectTime: new Date(),
            lastActivity: new Date(),
            audioSettings: {
                qualityEnhancement: true,
                minPacketSize: 50
            }
        };

        this.connections.set(connectionId, connectionInfo);

        logger.info('Voice connection established', {
            connectionId,
            remoteAddress: socket.remoteAddress,
            remotePort: socket.remotePort,
            totalConnections: this.connections.size,
            module: 'voice'
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
            logger.warn('Voice connection timeout', { connectionId, module: 'voice' });
            socket.destroy();
        });
    }

    /**
     * Handle incoming voice data with enhanced Paltalk RTP protocol validation
     * @param {string} connectionId 
     * @param {Buffer} data 
     */
    handleVoiceData(connectionId, data) {
        try {
            const connection = this.connections.get(connectionId);
            if (!connection) {
                logger.warn('Voice data from unknown connection', { connectionId, module: 'voice' });
                return;
            }

            // Update connection activity
            connection.lastActivity = Date.now();
            connection.bytesReceived += data.length;

            // Skip control packets
            const dataHex = data.toString('hex');
            if (this.isControlPacket(dataHex)) {
                this.handleControlPacket(connectionId, data);
                return;
            }

            // Only process authenticated connections for audio data
            if (!connection.isAuthenticated || !connection.roomId) {
                // Enhanced debugging to understand what packets we're receiving
                logger.debug('Audio data from unauthenticated connection', { 
                    connectionId,
                    isAuthenticated: connection.isAuthenticated,
                    roomId: connection.roomId,
                    dataLength: data.length,
                    dataHexStart: dataHex.substring(0, 24), // First 12 bytes
                    isControlPacket: this.isControlPacket(dataHex),
                    module: 'voice' 
                });
                
                // Try to see if this looks like a control packet we're not recognizing
                if (dataHex.startsWith('0000')) {
                    logger.info('Potential unrecognized control packet', {
                        connectionId,
                        fullDataHex: dataHex,
                        dataLength: data.length,
                        module: 'voice'
                    });
                }
                return;
            }

            // Validate RTP packet according to Paltalk protocol
            const rtpInfo = this.parseRTPHeader(data.length >= 4 ? data.slice(4) : data);
            if (rtpInfo.error) {
                // Try direct parsing if length header parsing failed
                const directRtpInfo = this.parseRTPHeader(data);
                if (directRtpInfo.error) {
                    logger.debug('Invalid RTP packet received', { 
                        connectionId, 
                        error: rtpInfo.error,
                        directError: directRtpInfo.error,
                        dataLength: data.length,
                        module: 'voice' 
                    });
                    return;
                }
            }

            // Update audio quality metrics with validated RTP info
            this.updateAudioQualityMetrics(connectionId, rtpInfo, data.length);

            // Apply audio quality filtering if needed
            const processedData = this.processAudioData(data, connection.audioSettings);
            if (processedData.length === 0) {
                return; // Packet was filtered out
            }

            // Relay to room members with proper Paltalk protocol formatting
            this.relayAudioData(connectionId, processedData);

        } catch (error) {
            logger.error('Error handling voice data', error, { connectionId, module: 'voice' });
        }
    }

    /**
     * Process audio data for quality enhancement
     * @param {Buffer} audioData 
     * @param {Object} settings 
     * @returns {Buffer}
     */
    processAudioData(audioData, settings) {
        // Basic audio processing - could be enhanced with actual audio filters
        if (!settings.qualityEnhancement) {
            return audioData;
        }

        // Simple noise gate simulation (placeholder for real audio processing)
        if (audioData.length < settings.minPacketSize) {
            return Buffer.alloc(0); // Drop very small packets (likely noise)
        }

        return audioData;
    }

    /**
     * Update audio quality metrics for a connection
     * @param {string} connectionId 
     * @param {Object} rtpInfo 
     * @param {number} packetSize 
     */
    updateAudioQualityMetrics(connectionId, rtpInfo, packetSize) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        if (!connection.qualityMetrics) {
            connection.qualityMetrics = {
                packetsReceived: 0,
                packetsLost: 0,
                lastSequenceNumber: 0,
                averagePacketSize: 0,
                jitter: 0,
                lastTimestamp: 0
            };
        }

        const metrics = connection.qualityMetrics;
        metrics.packetsReceived++;

        // Calculate packet loss
        if (metrics.lastSequenceNumber > 0) {
            const expectedSeq = (metrics.lastSequenceNumber + 1) & 0xFFFF;
            if (rtpInfo.sequenceNumber !== expectedSeq) {
                const lostPackets = (rtpInfo.sequenceNumber - expectedSeq) & 0xFFFF;
                metrics.packetsLost += lostPackets;
            }
        }
        metrics.lastSequenceNumber = rtpInfo.sequenceNumber;

        // Update average packet size
        metrics.averagePacketSize = 
            (metrics.averagePacketSize * (metrics.packetsReceived - 1) + packetSize) / metrics.packetsReceived;

        // Simple jitter calculation
        if (metrics.lastTimestamp > 0) {
            const timeDiff = Math.abs(rtpInfo.timestamp - metrics.lastTimestamp);
            metrics.jitter = (metrics.jitter * 15 + timeDiff) / 16; // Moving average
        }
        metrics.lastTimestamp = rtpInfo.timestamp;
    }

    /**
     * Get audio quality report for a connection
     * @param {string} connectionId 
     * @returns {Object}
     */
    getAudioQualityReport(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection || !connection.qualityMetrics) {
            return null;
        }

        const metrics = connection.qualityMetrics;
        const packetLossRate = metrics.packetsReceived > 0 ? 
            (metrics.packetsLost / (metrics.packetsReceived + metrics.packetsLost)) * 100 : 0;

        return {
            connectionId,
            packetsReceived: metrics.packetsReceived,
            packetsLost: metrics.packetsLost,
            packetLossRate: Math.round(packetLossRate * 100) / 100,
            averagePacketSize: Math.round(metrics.averagePacketSize),
            jitter: Math.round(metrics.jitter),
            quality: this.calculateQualityScore(packetLossRate, metrics.jitter)
        };
    }

    /**
     * Calculate overall quality score
     * @param {number} packetLossRate 
     * @param {number} jitter 
     * @returns {string}
     */
    calculateQualityScore(packetLossRate, jitter) {
        if (packetLossRate > 5 || jitter > 50) return 'Poor';
        if (packetLossRate > 2 || jitter > 30) return 'Fair';
        if (packetLossRate > 0.5 || jitter > 15) return 'Good';
        return 'Excellent';
    }

    /**
     * Check if data is a control packet
     * @param {string} dataHex 
     * @returns {boolean}
     */
    isControlPacket(dataHex) {
        // Check for known control packet patterns
        if (dataHex === '0000c353000f4242' || 
            dataHex === '0000c353000f4244' ||
            dataHex.startsWith('0000c353') ||
            dataHex.startsWith('0000c351')) { // Added c351 pattern from Wireshark
            return true;
        }
        
        // Additional patterns that might indicate control packets
        if (dataHex.startsWith('0000') && dataHex.length <= 32) {
            return true; // Short packets starting with 0000 are likely control
        }
        
        // Check for other potential authentication patterns
        if (dataHex.includes('000f42') || dataHex.includes('c353') || dataHex.includes('c351')) {
            return true;
        }
        
        return false;
    }

    /**
     * Handle control packets (authentication, room join, etc.)
     * @param {string} connectionId 
     * @param {Buffer} data 
     */
    handleControlPacket(connectionId, data) {
        const connection = this.connections.get(connectionId);
        const dataHex = data.toString('hex');
        
        logger.info('Control packet received - analyzing', {
            connectionId,
            dataLength: data.length,
            dataHex: dataHex,
            module: 'voice'
        });

        // Handle authentication packets
        if (dataHex === '0000c353000f4242' || dataHex === '0000c353000f4244') {
            // Send acknowledgment
            connection.socket.write(Buffer.alloc(0));
            logger.info('Authentication packet acknowledged', { connectionId, dataHex, module: 'voice' });
            return;
        }

        // Handle voice room join packet where room ID is in the first 4 bytes
        // Example: 0000c35100000000082a = roomId(0000c351=50001) + userId(0) + port(082a=2090)
        if (data.length >= 8) {
            try {
                const roomId = data.readUInt32BE(0); // First 4 bytes = room ID
                const userId = data.readUInt32BE(4); // Next 4 bytes = user ID (might be 0)
                
                logger.info('Voice room join packet detected', {
                    connectionId,
                    roomId,
                    userId,
                    dataHex,
                    module: 'voice'
                });
                
                // Validate that the room exists
                if (this.serverState) {
                    const room = this.serverState.getRoom(roomId);
                    if (!room) {
                        logger.warn('Voice connection attempt to non-existent room', {
                            connectionId,
                            roomId,
                            userId,
                            module: 'voice'
                        });
                        // Send error response and close connection
                        const errorBuffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]); // Error response
                        connection.socket.write(errorBuffer);
                        connection.socket.end();
                        return;
                    }
                    
                    logger.info('Room validation successful', {
                        connectionId,
                        roomId,
                        roomName: room.name,
                        module: 'voice'
                    });
                }
                
                // The userId field in the packet is typically 0 and not the actual user ID
                // The real user ID association happens through the main server
                logger.info('Room join packet - user ID will be associated separately', {
                    connectionId,
                    roomId,
                    packetUserId: userId, // This is usually 0
                    remoteAddress: connection.socket.remoteAddress,
                    module: 'voice'
                });
                
                // Authenticate with room but without user ID for now
                connection.roomId = roomId;
                connection.userId = null; // Will be set later by main server
                connection.isAuthenticated = true;
                connection.awaitingUserAssociation = true;
                
                // Add to room
                if (!this.rooms.has(roomId)) {
                    this.rooms.set(roomId, new Set());
                }
                this.rooms.get(roomId).add(connectionId);
                
                logger.info('Voice connection authenticated for room (awaiting user association)', {
                    connectionId,
                    roomId,
                    roomMemberCount: this.rooms.get(roomId).size,
                    module: 'voice'
                });
                
                // Send join confirmation
                const confirmationBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
                connection.socket.write(confirmationBuffer);
                return;
                
            } catch (error) {
                logger.error('Error parsing voice room join packet', error, {
                    connectionId,
                    dataHex,
                    module: 'voice'
                });
            }
        }

        // Handle room join packets (format: 0000c353 + roomId + userId)
        if (dataHex.startsWith('0000c353') && data.length >= 12) {
            try {
                const roomId = data.readUInt32BE(4);
                const userId = data.readUInt32BE(8);
                
                logger.info('Room join packet detected', {
                    connectionId,
                    roomId,
                    userId,
                    dataHex,
                    module: 'voice'
                });
                
                this.authenticateAndJoinRoom(connectionId, roomId, userId);
                return;
            } catch (error) {
                logger.error('Error parsing room join packet', error, {
                    connectionId,
                    dataHex,
                    module: 'voice'
                });
            }
        }
        
        // Handle other potential control patterns
        if (dataHex.startsWith('0000')) {
            logger.info('Unknown control packet pattern', {
                connectionId,
                dataHex,
                dataLength: data.length,
                pattern: 'starts_with_0000',
                module: 'voice'
            });
            
            // Try to extract potential room/user IDs from different positions
            if (data.length >= 8) {
                try {
                    const possibleRoomId1 = data.readUInt32BE(0);
                    const possibleUserId1 = data.readUInt32BE(4);
                    logger.debug('Potential IDs at positions 0,4', {
                        connectionId,
                        possibleRoomId1,
                        possibleUserId1,
                        module: 'voice'
                    });
                } catch (e) {}
            }
            
            if (data.length >= 12) {
                try {
                    const possibleRoomId2 = data.readUInt32BE(4);
                    const possibleUserId2 = data.readUInt32BE(8);
                    logger.debug('Potential IDs at positions 4,8', {
                        connectionId,
                        possibleRoomId2,
                        possibleUserId2,
                        module: 'voice'
                    });
                } catch (e) {}
            }
        }
        
        // Send generic acknowledgment for unrecognized control packets
        try {
            connection.socket.write(Buffer.from([0x00, 0x00, 0x00, 0x00]));
            logger.debug('Generic acknowledgment sent for unrecognized control packet', {
                connectionId,
                dataHex,
                module: 'voice'
            });
        } catch (error) {
            logger.error('Failed to send acknowledgment', error, { connectionId, module: 'voice' });
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
            roomMemberCount: this.rooms.get(roomId).size,
            module: 'voice'
        });

        // Send join confirmation
        const confirmationBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
        connection.socket.write(confirmationBuffer);
    }

    /**
     * Relay audio data to other connections in the same room
     * Following Paltalk RTP Protocol specification
     * @param {string} senderConnectionId 
     * @param {Buffer} audioData 
     */
    relayAudioData(senderConnectionId, audioData) {
        const senderConnection = this.connections.get(senderConnectionId);
        if (!senderConnection || !senderConnection.roomId) return;

        const roomId = senderConnection.roomId;
        const roomConnections = this.rooms.get(roomId);
        
        if (!roomConnections) return;

        // Validate and process RTP packet according to Paltalk protocol
        let processedData = this.validateAndProcessRTPPacket(audioData, senderConnection.userId);
        if (!processedData) {
            logger.debug('Invalid RTP packet dropped', {
                senderConnectionId,
                roomId,
                dataLength: audioData.length,
                module: 'voice'
            });
            return;
        }

        // Update global stats
        this.stats.totalPacketsRelayed++;

        // Relay to all other connections in the room
        let relayCount = 0;
        let errorCount = 0;

        roomConnections.forEach(connectionId => {
            if (connectionId !== senderConnectionId) {
                const targetConnection = this.connections.get(connectionId);
                if (targetConnection && targetConnection.socket.writable) {
                    try {
                        // Send with proper Paltalk format: 4-byte length header + RTP packet
                        this.sendRTPPacketToClient(targetConnection.socket, processedData);
                        targetConnection.bytesSent += processedData.length + 4; // Include length header
                        relayCount++;
                    } catch (error) {
                        logger.debug('Failed to relay audio to connection', {
                            targetConnectionId: connectionId,
                            error: error.message,
                            module: 'voice'
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
                dataSize: processedData.length,
                module: 'voice'
            });
        }
    }

    /**
     * Validate and process RTP packet according to Paltalk protocol
     * @param {Buffer} audioData 
     * @param {number} senderUserId 
     * @returns {Buffer|null}
     */
    validateAndProcessRTPPacket(audioData, senderUserId) {
        try {
            // Extract RTP packet from received data
            let rtpPacket;
            if (audioData.length >= 4) {
                const lengthHeader = audioData.readUInt32LE(0);
                const packetLength = lengthHeader & 0xFF; // Only last byte matters per protocol
                
                if (packetLength > 0 && packetLength < 150 && audioData.length >= packetLength + 4) {
                    rtpPacket = audioData.slice(4, 4 + packetLength);
                } else {
                    // Try without length header (direct RTP)
                    rtpPacket = audioData;
                }
            } else {
                rtpPacket = audioData;
            }

            // Validate minimum RTP packet size
            if (rtpPacket.length < 12) {
                logger.debug('RTP packet too small', { 
                    packetLength: rtpPacket.length,
                    module: 'voice'
                });
                return null;
            }

            // Parse and validate RTP header
            const rtpInfo = this.parseRTPHeader(rtpPacket);
            
            // Critical validation: Payload type MUST be 3 for Paltalk
            if (rtpInfo.payloadType !== 3) {
                logger.debug('Invalid payload type for Paltalk protocol', {
                    payloadType: rtpInfo.payloadType,
                    expected: 3,
                    module: 'voice'
                });
                return null;
            }

            // Validate audio payload size (minimum 136 bytes per protocol)
            const headerSize = 12 + (rtpInfo.cc * 4); // Basic header + CSRC list
            const payloadSize = rtpPacket.length - headerSize;
            
            if (payloadSize < 136) {
                logger.debug('Audio payload too small for Paltalk protocol', {
                    payloadSize,
                    minimum: 136,
                    module: 'voice'
                });
                return null;
            }

            // Update SSRC to match sender's user ID for proper speaker identification
            if (senderUserId && rtpInfo.ssrc !== senderUserId) {
                rtpPacket.writeUInt32BE(senderUserId, 8);
                logger.debug('Updated SSRC for speaker identification', {
                    originalSSRC: rtpInfo.ssrc,
                    newSSRC: senderUserId,
                    module: 'voice'
                });
            }

            return rtpPacket;

        } catch (error) {
            logger.error('Error validating RTP packet', error, { module: 'voice' });
            return null;
        }
    }

    /**
     * Send RTP packet to client with proper Paltalk format
     * @param {Socket} socket 
     * @param {Buffer} rtpPacket 
     */
    sendRTPPacketToClient(socket, rtpPacket) {
        // Create 4-byte length header (little-endian, only last byte used by client)
        const lengthHeader = Buffer.alloc(4);
        const packetLength = Math.min(rtpPacket.length, 149); // Max valid length per protocol
        lengthHeader.writeUInt32LE(packetLength, 0);
        
        // Validate length is within Paltalk protocol limits
        if (packetLength <= 0 || packetLength >= 150) {
            logger.warn('RTP packet length outside valid range', {
                length: packetLength,
                validRange: '1-149',
                module: 'voice'
            });
            return;
        }

        // Send complete packet: length header + RTP data
        const completePacket = Buffer.concat([lengthHeader, rtpPacket]);
        socket.write(completePacket);

        // Log packet transmission periodically
        if (Math.random() < 0.001) { // 0.1% sampling
            const rtpInfo = this.parseRTPHeader(rtpPacket);
            logger.debug('RTP packet sent to client', {
                packetLength,
                payloadType: rtpInfo.payloadType,
                ssrc: rtpInfo.ssrc,
                sequenceNumber: rtpInfo.sequenceNumber,
                module: 'voice'
            });
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
                logger.debug('Empty voice room cleaned up', { roomId, module: 'voice' });
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
            bytesSent: connection.bytesSent,
            module: 'voice'
        });

        this.cleanupConnection(connectionId);
    }

    /**
     * Handle connection error
     * @param {string} connectionId 
     * @param {Error} error 
     */
    handleConnectionError(connectionId, error) {
        logger.error('Voice connection error', error, { 
            connectionId,
            module: 'voice'
        });
        this.cleanupConnection(connectionId);
    }

    /**
     * Handle connection end
     * @param {string} connectionId 
     */
    handleConnectionEnd(connectionId) {
        logger.debug('Voice connection ended', { connectionId, module: 'voice' });
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
            activeRooms: this.rooms.size,
            module: 'voice'
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
     * Enhanced cleanup for dead connections and resources
     */
    performCleanup() {
        try {
            logger.debug('🧹 Performing voice server cleanup...', { module: 'voice' });

            const now = Date.now();
            let cleanedConnections = 0;
            let cleanedRooms = 0;

            // Clean up inactive connections
            for (const [connectionId, connection] of this.connections) {
                const inactiveTime = now - connection.lastActivity;
                
                // Remove connections inactive for more than 5 minutes
                if (inactiveTime > 5 * 60 * 1000) {
                    logger.debug('Cleaning up inactive voice connection', { 
                        connectionId, 
                        inactiveTime: Math.round(inactiveTime / 1000) + 's',
                        module: 'voice'
                    });
                    
                    this.handleConnectionEnd(connectionId);
                    cleanedConnections++;
                }
            }

            // Clean up empty rooms
            for (const [roomId, connectionSet] of this.rooms) {
                if (connectionSet.size === 0) {
                    this.rooms.delete(roomId);
                    cleanedRooms++;
                }
            }

            // Log cleanup results
            if (cleanedConnections > 0 || cleanedRooms > 0) {
                logger.info('Voice server cleanup completed', { 
                    cleanedConnections, 
                    cleanedRooms,
                    module: 'voice'
                });
            }

            // Update server statistics
            this.stats.lastCleanup = now;

        } catch (error) {
            logger.error('Error during voice server cleanup', error, { module: 'voice' });
        }
    }

    /**
     * Get comprehensive voice server statistics
     * @returns {Object}
     */
    getServerStatistics() {
        const stats = {
            ...this.stats,
            currentConnections: this.connections.size,
            activeRooms: this.rooms.size,
            uptime: Date.now() - this.stats.serverStartTime,
            serverStartTime: this.stats.serverStartTime, // Add this for uptime calculation
            isRunning: this.isRunning,
            port: SERVER_CONFIG.VOICE_PORT,
            rooms: [],
            qualityReports: [],
            connections: [],
            protocolCompliance: []
        };

        // Add room statistics
        for (const [roomId, connectionSet] of this.rooms) {
            stats.rooms.push({
                roomId,
                connectionCount: connectionSet.size,
                isPermanent: false, // Voice server doesn't track room permanence
                createdAt: null // Voice server doesn't track room creation time
            });
        }

        // Add connection details and quality reports
        for (const [connectionId, connection] of this.connections) {
            // Add connection info
            stats.connections.push({
                id: connectionId,
                userId: connection.userId || 'Pending',
                roomId: connection.roomId || 'Not assigned',
                isAuthenticated: connection.isAuthenticated,
                bytesReceived: connection.bytesReceived || 0,
                bytesSent: connection.bytesSent || 0,
                connectTime: connection.connectTime,
                lastActivity: connection.lastActivity,
                duration: Date.now() - (connection.connectTime?.getTime() || Date.now()),
                remoteAddress: connection.socket.remoteAddress
            });

            // Add quality report
            const qualityReport = this.getAudioQualityReport(connectionId);
            if (qualityReport) {
                stats.qualityReports.push(qualityReport);
            }

            // Add protocol compliance data
            stats.protocolCompliance.push({
                connectionId: connectionId,
                compliance: connection.isAuthenticated ? 100 : 50, // Basic compliance check
                rtpValidation: true, // Assuming RTP validation is working
                packetFormat: 'Paltalk RTP'
            });
        }

        return stats;
    }

    /**
     * Monitor server health and performance
     */
    startHealthMonitoring() {
        setInterval(() => {
            const stats = this.getServerStatistics();
            
            // Log performance metrics
            logger.debug('Voice server health check', {
                connections: stats.currentConnections,
                rooms: stats.activeRooms,
                totalPackets: stats.totalPacketsRelayed,
                module: 'voice'
            });

            // Check for performance issues
            if (stats.currentConnections > 50) {
                logger.warn('High voice connection count', { 
                    connections: stats.currentConnections,
                    module: 'voice'
                });
            }

            // Check quality reports for poor connections
            const poorQualityConnections = stats.qualityReports.filter(
                report => report.quality === 'Poor'
            );

            if (poorQualityConnections.length > 0) {
                logger.warn('Poor quality voice connections detected', {
                    count: poorQualityConnections.length,
                    connections: poorQualityConnections.map(r => r.connectionId),
                    module: 'voice'
                });
            }

        }, 60000); // Every minute
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
                
                logger.info('Voice server stopped', { module: 'voice' });
                resolve();
            });
        });
    }

    /**
     * Parse RTP header for debugging/logging and validation
     * @param {Buffer} packet 
     * @returns {Object}
     */
    parseRTPHeader(packet) {
        if (packet.length < 12) {
            return { error: 'Packet too small for RTP header' };
        }

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

            // Validate RTP version
            if (version !== 2) {
                return { error: `Invalid RTP version: ${version}, expected 2` };
            }

            return {
                version,
                padding,
                extension,
                cc,
                marker,
                payloadType,
                sequenceNumber,
                timestamp,
                ssrc,
                valid: true
            };
        } catch (error) {
            return { error: `Failed to parse RTP header: ${error.message}` };
        }
    }

    /**
     * Link authenticated voice connection to user's current room
     * @param {string} connectionId 
     */
    linkToUserRoom(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) return false;

        // We need to get the user's current room from the main server
        // For now, we'll need a way to communicate with the main server
        // This is a temporary solution - we should add proper integration
        
        logger.info('Attempting to link voice connection to user room', {
            connectionId,
            remoteAddress: connection.socket.remoteAddress,
            module: 'voice'
        });
        
        return false; // Will implement proper linking
    }

    /**
     * Manually associate voice connection with room and user
     * This can be called from the main server when a user joins a voice room
     * @param {string} remoteAddress 
     * @param {number} roomId 
     * @param {number} userId 
     */
    associateConnectionWithRoom(remoteAddress, roomId, userId) {
        // Find connection by remote address
        for (const [connectionId, connection] of this.connections) {
            if (connection.socket.remoteAddress === remoteAddress && 
                connection.isAuthenticated && 
                !connection.roomId) {
                
                // Join room
                connection.roomId = roomId;
                connection.userId = userId;

                // Add to room
                if (!this.rooms.has(roomId)) {
                    this.rooms.set(roomId, new Set());
                }
                this.rooms.get(roomId).add(connectionId);

                logger.info('Voice connection associated with room', {
                    connectionId,
                    roomId,
                    userId,
                    remoteAddress,
                    roomMemberCount: this.rooms.get(roomId).size,
                    module: 'voice'
                });
                
                return true;
            }
        }
        
        logger.warn('Could not find authenticated voice connection for room association', {
            remoteAddress,
            roomId,
            userId,
            module: 'voice'
        });
        
        return false;
    }

    /**
     * Associate a user ID with an existing voice connection
     * Called by the main server when a user joins voice
     * @param {string} connectionId 
     * @param {number} userId 
     */
    associateUserWithConnection(connectionId, userId) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            logger.warn('Cannot associate user - connection not found', {
                connectionId,
                userId,
                module: 'voice'
            });
            return false;
        }

        if (!connection.isAuthenticated || !connection.roomId) {
            logger.warn('Cannot associate user - connection not authenticated', {
                connectionId,
                userId,
                isAuthenticated: connection.isAuthenticated,
                roomId: connection.roomId,
                module: 'voice'
            });
            return false;
        }

        connection.userId = userId;
        connection.awaitingUserAssociation = false;
        
        logger.info('User associated with voice connection', {
            connectionId,
            userId,
            roomId: connection.roomId,
            module: 'voice'
        });

        return true;
    }

    /**
     * Find voice connection by room and remote address
     * Useful for associating users when we only know the room and IP
     * @param {number} roomId 
     * @param {string} remoteAddress 
     * @returns {string|null} connectionId
     */
    findConnectionByRoomAndAddress(roomId, remoteAddress) {
        for (const [connectionId, connection] of this.connections.entries()) {
            if (connection.roomId === roomId && 
                connection.socket.remoteAddress === remoteAddress &&
                connection.awaitingUserAssociation) {
                return connectionId;
            }
        }
        return null;
    }

    // ...existing methods...
}

module.exports = VoiceServer;
