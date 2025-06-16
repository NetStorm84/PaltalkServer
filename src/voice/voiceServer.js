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
        this.stats = {
            serverStartTime: Date.now(),
            lastCleanup: Date.now(),
            totalPacketsRelayed: 0
        };
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
     * Handle incoming voice data
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

            // Parse RTP header for quality monitoring
            const rtpInfo = this.parseRTPHeader(data);
            if (rtpInfo.error) {
                logger.debug('Invalid RTP packet', { connectionId, error: rtpInfo.error, module: 'voice' });
                return;
            }

            // Update audio quality metrics
            this.updateAudioQualityMetrics(connectionId, rtpInfo, data.length);

            // Apply audio quality filtering if needed
            const processedData = this.processAudioData(data, connection.audioSettings);

            // Relay to room members
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
        const dataHex = data.toString('hex');            logger.debug('Control packet received', {
            connectionId,
            dataHex: dataHex.substring(0, 32) + (dataHex.length > 32 ? '...' : ''),
            module: 'voice'
        });

        // Handle authentication packets
        if (dataHex === '0000c353000f4242' || dataHex === '0000c353000f4244') {
            // Send acknowledgment
            connection.socket.write(Buffer.alloc(0));
            logger.debug('Authentication packet acknowledged', { connectionId, module: 'voice' });
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
            roomMemberCount: this.rooms.get(roomId).size,
            module: 'voice'
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
                            timestamp: rtpInfo.timestamp,
                            module: 'voice'
                        });
                    }
                }
            }
        } catch (error) {
            logger.debug('Error parsing RTP packet, relaying raw data', { error: error.message, module: 'voice' });
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
            for (const [roomId, room] of this.rooms) {
                if (room.connections.size === 0 && !room.isPermanent) {
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
            rooms: [],
            qualityReports: []
        };

        // Add room statistics
        for (const [roomId, room] of this.rooms) {
            stats.rooms.push({
                roomId,
                connectionCount: room.connections.size,
                isPermanent: room.isPermanent,
                createdAt: room.createdAt
            });
        }

        // Add quality reports for active connections
        for (const [connectionId] of this.connections) {
            const qualityReport = this.getAudioQualityReport(connectionId);
            if (qualityReport) {
                stats.qualityReports.push(qualityReport);
            }
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
}

module.exports = VoiceServer;
