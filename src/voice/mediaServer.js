/**
 * Paltalk 5.x compatible TCP-based media server
 * Based on Gaim plugin analysis - uses TCP for all voice communication
 * Future support for video will be added here
 */
const net = require('net');
const logger = require('../utils/logger');
const { SERVER_CONFIG, LOGGING_CONFIG } = require('../config/constants');
const { PACKET_TYPES } = require('../../PacketHeaders');
const { sendPacket } = require('../network/packetSender');

class MediaServer {
    constructor() {
        this.server = null;
        this.connections = new Map(); // socketId -> connection info
        this.rooms = new Map(); // roomId -> Set of socketIds
        this.persistentRoomMembers = new Map(); // roomId -> Set of userIds (persists across connections)
        this.userActiveConnections = new Map(); // userId -> most recent active connectionId
        this.userLastActivity = new Map(); // userId -> timestamp of last activity
        this.activeSpeakers = new Map(); // roomId -> { connectionId, startTime, userId }
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
     * Start the voice server (Paltalk 5.x TCP-only)
     */
    start() {
        return new Promise((resolve, reject) => {
            // Start TCP server for voice and control
            this.server = net.createServer(socket => {
                this.handleNewConnection(socket);
            });

            this.server.listen(SERVER_CONFIG.VOICE_PORT, SERVER_CONFIG.SERVER_IP, () => {
                this.isRunning = true;
                logger.info('Media server started (Paltalk 5.x TCP mode)', { 
                    port: SERVER_CONFIG.VOICE_PORT,
                    ip: SERVER_CONFIG.SERVER_IP,
                    module: 'media'
                });
                
                // Test if we can connect to ourselves
                const testSocket = net.createConnection(SERVER_CONFIG.VOICE_PORT, SERVER_CONFIG.VOICE_SERVER_IP, () => {
                    logger.info('Voice server connectivity test successful', {
                        testIP: SERVER_CONFIG.VOICE_SERVER_IP,
                        testPort: SERVER_CONFIG.VOICE_PORT,
                        module: 'voice'
                    });
                    testSocket.end();
                });
                
                testSocket.on('error', (error) => {
                    logger.error('Voice server connectivity test failed', error, {
                        testIP: SERVER_CONFIG.VOICE_SERVER_IP,
                        testPort: SERVER_CONFIG.VOICE_PORT,
                        module: 'voice'
                    });
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
        // Validate socket
        if (!socket || !socket.remoteAddress) {
            logger.warn('Invalid socket connection attempt', { module: 'voice' });
            if (socket) {
                socket.destroy();
            }
            return;
        }

        // Check connection limits
        if (this.connections.size >= 100) { // Max 100 voice connections
            logger.warn('Voice connection limit reached', { 
                currentConnections: this.connections.size,
                remoteAddress: socket.remoteAddress,
                module: 'voice' 
            });
            socket.destroy();
            return;
        }

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
                minPacketSize: 50,
                noiseGateThreshold: 8,
                enableCompression: true,
                compressionThreshold: 45,
                compressionRatio: 2.5,
                previousFrame: null,
                jitterBuffer: [],
                maxJitterBuffer: 5, // Increased buffer for smoother playback
                lastSequence: 0,
                packetTiming: [],
                avgPacketInterval: 160, // GSM packets should arrive every ~160ms
                adaptiveBuffer: true
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

        // Set up event handlers with error handling
        socket.on('data', data => {
            // Log raw data at TCP level
            logger.info('>>> RAW TCP DATA <<<', {
                connectionId,
                bytesReceived: data.length,
                hexPreview: data.toString('hex').substring(0, 32),
                timestamp: Date.now(),
                module: 'voice'
            });
            
            try {
                this.handleVoiceData(connectionId, data);
            } catch (error) {
                logger.error('Error handling voice data', error, { connectionId, module: 'voice' });
            }
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

        // Don't set socket timeout - voice connections should persist as long as user is in room
        // Cleanup will be handled by periodic maintenance and room leave events
        logger.debug('Voice connection established without timeout', { 
            connectionId, 
            module: 'voice' 
        });

        // Set socket options for better performance  
        socket.setNoDelay(true); // Disable Nagle's algorithm for real-time audio
        socket.setKeepAlive(true, 60000); // Standard keep-alive
        
        // Optimize TCP buffer sizes for audio streaming
        try {
            // Smaller buffers for lower latency
            if (socket.setRecvBufferSize) socket.setRecvBufferSize(4096);
            if (socket.setSendBufferSize) socket.setSendBufferSize(4096);
            
            // Set socket priority for audio traffic (if supported)
            if (socket.setTOS) socket.setTOS(0x10); // IPTOS_LOWDELAY
        } catch (error) {
            // Ignore errors for unsupported socket options
        }
    }

    /**
     * Handle incoming voice data (Paltalk 5.x TCP format)
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

            const dataHex = data.toString('hex');
            
            logger.info('=== PALTALK 5 VOICE DATA ===', {
                connectionId,
                dataLength: data.length,
                hexData: dataHex,
                isAuthenticated: connection.isAuthenticated,
                roomId: connection.roomId,
                userId: connection.userId,
                module: 'voice'
            });
            
            // Handle initial handshake (room join)
            if (!connection.isAuthenticated) {
                this.handlePaltalk5Handshake(connectionId, data);
                return;
            }

            // Handle voice packets after authentication
            this.handlePaltalk5VoicePacket(connectionId, data);

        } catch (error) {
            logger.error('Error handling voice data', error, { connectionId, module: 'voice' });
        }
    }

    /**
     * Handle Paltalk 5 handshake packets
     * Based on Gaim plugin: room ID (4 bytes) + user ID (4 bytes)
     */
    handlePaltalk5Handshake(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        if (data.length === 8) {
            // Initial handshake: room ID (4 bytes) + user ID (4 bytes)
            const roomId = data.readUInt32BE(0);
            const userId = data.readUInt32BE(4);

            logger.info('Paltalk 5 handshake received', {
                connectionId,
                roomId,
                userId,
                hexData: data.toString('hex'),
                module: 'voice'
            });

            // Authenticate and join room
            this.authenticatePaltalk5User(connectionId, roomId, userId);
            
        } else if (data.length === 4) {
            // Single 4-byte packet (might be room ID or user ID)
            const value = data.readUInt32BE(0);
            
            if (!connection.roomId) {
                connection.roomId = value;
                logger.info('Room ID received', { connectionId, roomId: value, module: 'voice' });
            } else if (!connection.userId) {
                connection.userId = value;
                logger.info('User ID received', { connectionId, userId: value, module: 'voice' });
                
                // Complete authentication
                this.authenticatePaltalk5User(connectionId, connection.roomId, connection.userId);
            }
        } else {
            logger.warn('Unexpected handshake packet size', {
                connectionId,
                dataLength: data.length,
                hexData: data.toString('hex'),
                module: 'voice'
            });
        }
    }

    /**
     * Authenticate Paltalk 5 user and join voice room
     */
    authenticatePaltalk5User(connectionId, roomId, userId) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        // Set connection details
        connection.roomId = roomId;
        connection.userId = userId;
        connection.isAuthenticated = true;

        // Add to room
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(connectionId);

        // Add to persistent room members
        if (!this.persistentRoomMembers.has(roomId)) {
            this.persistentRoomMembers.set(roomId, new Set());
        }
        this.persistentRoomMembers.get(roomId).add(userId);

        logger.info('Paltalk 5 user authenticated and joined voice room', {
            connectionId,
            roomId,
            userId,
            roomMembers: this.persistentRoomMembers.get(roomId).size,
            module: 'voice'
        });

        // According to Gaim code, the voice server doesn't send the ACK packet
        // The ACK is sent by the main chat server via pt_send_packet()
        // Just keep the voice connection alive for audio packets
        
        logger.info('Voice connection authenticated - ready for audio packets', {
            connectionId,
            roomId,
            userId,
            module: 'voice'
        });
    }

    /**
     * Handle Paltalk 5 voice packets (after authentication)
     * Format: 4-byte length + 148-byte RTP packet
     */
    handlePaltalk5VoicePacket(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        // Paltalk 5 voice format: 4-byte length header + RTP packet
        if (data.length < 4) {
            logger.warn('Voice packet too small', { connectionId, dataLength: data.length, module: 'voice' });
            return;
        }

        const packetLength = data.readUInt32BE(0);
        
        if (data.length !== packetLength + 4) {
            logger.warn('Voice packet length mismatch', {
                connectionId,
                expectedLength: packetLength + 4,
                actualLength: data.length,
                module: 'voice'
            });
            return;
        }

        const rtpPacket = data.slice(4);

        // Validate this is a 148-byte RTP packet with payload type 3 (GSM)
        if (rtpPacket.length !== 148) {
            logger.warn('Invalid RTP packet length', {
                connectionId,
                expectedLength: 148,
                actualLength: rtpPacket.length,
                module: 'voice'
            });
            return;
        }

        // Parse RTP header
        const rtpVersion = (rtpPacket[0] >> 6) & 0x03;
        const payloadType = rtpPacket[1] & 0x7F;
        const sequenceNumber = rtpPacket.readUInt16BE(2);
        const timestamp = rtpPacket.readUInt32BE(4);
        const ssrc = rtpPacket.readUInt32BE(8);

        if (rtpVersion !== 2 || payloadType !== 3) {
            logger.warn('Invalid RTP packet format', {
                connectionId,
                rtpVersion,
                payloadType,
                expectedPayloadType: 3,
                module: 'voice'
            });
            return;
        }

        logger.info('Valid Paltalk 5 voice packet received', {
            connectionId,
            roomId: connection.roomId,
            userId: connection.userId,
            packetLength,
            sequenceNumber,
            payloadType,
            ssrc,
            module: 'voice'
        });

        // Process audio for quality enhancement before relay
        let processedData = this.processAudioData(data, connection.audioSettings);
        
        // Apply jitter buffering for smoother audio
        processedData = this.applyJitterBuffering(connectionId, processedData);
        
        // Update previous frame for next processing cycle
        if (processedData && processedData.length >= 148) {
            // Store the last GSM frame for interpolation
            connection.audioSettings.previousFrame = processedData.slice(132, 165); // Last 33-byte frame
        }

        // Relay to other users in the room (only if we have processed data)
        if (processedData) {
            this.relayPaltalk5Audio(connectionId, processedData);
        }
    }

    /**
     * Relay Paltalk 5 audio to other room members
     */
    relayPaltalk5Audio(senderConnectionId, audioData) {
        const senderConnection = this.connections.get(senderConnectionId);
        if (!senderConnection) return;

        const roomId = senderConnection.roomId;
        const roomMembers = this.rooms.get(roomId);
        
        if (!roomMembers) {
            logger.warn('No room members found for relay', {
                senderConnectionId,
                roomId,
                module: 'voice'
            });
            return;
        }

        // Check if there's already an active speaker in this room
        const currentSpeaker = this.activeSpeakers.get(roomId);
        const now = Date.now();
        
        if (currentSpeaker && currentSpeaker.connectionId !== senderConnectionId) {
            // Check if current speaker has been silent for too long (3 seconds)
            const silentTime = now - currentSpeaker.lastActivity;
            if (silentTime > 3000) {
                logger.info('Releasing speaker slot due to silence - new speaker taking over', {
                    oldSpeakerConnectionId: currentSpeaker.connectionId,
                    oldSpeakerUserId: currentSpeaker.userId,
                    newSpeakerConnectionId: senderConnectionId,
                    newSpeakerUserId: senderConnection.userId,
                    silentTime: Math.round(silentTime / 1000),
                    roomId,
                    module: 'voice'
                });
                // Release the old speaker slot - new speaker will claim it below
                this.activeSpeakers.delete(roomId);
            } else {
                // Someone else is still actively speaking - don't relay this audio
                logger.debug('Audio blocked - another user is actively speaking', {
                    senderConnectionId,
                    currentSpeakerConnectionId: currentSpeaker.connectionId,
                    currentSpeakerUserId: currentSpeaker.userId,
                    timeSinceLastActivity: Math.round(silentTime / 1000),
                    roomId,
                    module: 'voice'
                });
                return;
            }
        }
        
        // Set or update the active speaker for this room
        this.activeSpeakers.set(roomId, {
            connectionId: senderConnectionId,
            userId: senderConnection.userId,
            startTime: currentSpeaker ? currentSpeaker.startTime : now,
            lastActivity: now
        });
        
        logger.debug('Audio relay from active speaker', {
            senderConnectionId,
            userId: senderConnection.userId,
            roomId,
            module: 'voice'
        });

        let relayCount = 0;

        roomMembers.forEach(connectionId => {
            if (connectionId !== senderConnectionId) {
                const connection = this.connections.get(connectionId);
                
                if (connection && connection.socket && !connection.socket.destroyed && connection.socket.writable) {
                    try {
                        // Use immediate write for better timing consistency
                        const success = connection.socket.write(audioData);
                        if (success) {
                            relayCount++;
                        } else {
                            // Socket buffer is full - schedule write after drain
                            connection.socket.once('drain', () => {
                                if (!connection.socket.destroyed) {
                                    connection.socket.write(audioData);
                                }
                            });
                            relayCount++;
                        }
                        
                        // Update connection stats
                        connection.bytesSent += audioData.length;
                        connection.lastActivity = Date.now();
                        
                    } catch (error) {
                        logger.error('Failed to relay audio', {
                            targetConnection: connectionId,
                            error: error.message,
                            module: 'voice'
                        });
                    }
                }
            }
        });


        this.stats.totalPacketsRelayed++;
    }

    /**
     * Process audio data for quality enhancement within Paltalk protocol constraints
     * @param {Buffer} rtpPacket - Complete 148-byte RTP packet
     * @param {Object} settings 
     * @returns {Buffer}
     */
    processAudioData(rtpPacket, settings) {
        if (!settings.qualityEnhancement || rtpPacket.length !== 148) {
            return rtpPacket;
        }

        // Extract GSM audio payload (4 x 33 bytes starting at offset 12)
        const gsmFrames = [];
        for (let i = 0; i < 4; i++) {
            const frameStart = 12 + (i * 33);
            gsmFrames.push(rtpPacket.slice(frameStart, frameStart + 33));
        }

        // Apply quality enhancements to GSM frames
        const enhancedFrames = gsmFrames.map(frame => this.enhanceGSMFrame(frame, settings));

        // Rebuild the RTP packet with enhanced audio
        const enhancedPacket = Buffer.from(rtpPacket);
        for (let i = 0; i < 4; i++) {
            const frameStart = 12 + (i * 33);
            enhancedFrames[i].copy(enhancedPacket, frameStart);
        }

        return enhancedPacket;
    }

    /**
     * Enhance individual GSM frame for better quality
     * @param {Buffer} gsmFrame - 33-byte GSM frame
     * @param {Object} settings 
     * @returns {Buffer}
     */
    enhanceGSMFrame(gsmFrame, settings) {
        if (gsmFrame.length !== 33) return gsmFrame;

        // Create a copy to avoid modifying original
        const enhanced = Buffer.from(gsmFrame);

        // 1. Silence detection and noise gate
        const energy = this.calculateFrameEnergy(gsmFrame);
        if (energy < settings.noiseGateThreshold) {
            // Replace with comfort noise instead of complete silence
            return this.generateComfortNoise();
        }

        // 2. Dynamic range compression for consistent volume
        if (settings.enableCompression && energy > settings.compressionThreshold) {
            return this.applyCompression(enhanced, energy, settings);
        }

        // 3. Packet loss concealment - check for corrupted frames
        if (this.isFrameCorrupted(gsmFrame)) {
            return this.interpolateFrame(gsmFrame, settings);
        }

        return enhanced;
    }

    /**
     * Calculate energy level of GSM frame for quality analysis
     * @param {Buffer} gsmFrame 
     * @returns {number}
     */
    calculateFrameEnergy(gsmFrame) {
        let energy = 0;
        for (let i = 0; i < gsmFrame.length; i++) {
            energy += Math.abs(gsmFrame[i] - 128); // Center around 128
        }
        return energy / gsmFrame.length;
    }

    /**
     * Generate comfort noise for silence periods
     * @returns {Buffer}
     */
    generateComfortNoise() {
        const noise = Buffer.alloc(33);
        // Generate low-level pink noise
        for (let i = 0; i < 33; i++) {
            noise[i] = 128 + Math.floor((Math.random() - 0.5) * 6); // ±3 around center
        }
        return noise;
    }

    /**
     * Apply volume boost to GSM frame
     * @param {Buffer} frame - Frame to modify in place
     * @param {number} boostFactor - Multiplier (1.0 = no change, >1.0 = louder)
     */
    applyVolumeBoost(frame, boostFactor) {
        for (let i = 0; i < frame.length; i++) {
            const centered = frame[i] - 128; // Center around 0
            const boosted = Math.round(centered * boostFactor);
            // Clamp to valid range and convert back
            frame[i] = Math.max(0, Math.min(255, boosted + 128));
        }
    }

    /**
     * Apply dynamic range compression to reduce volume spikes
     * @param {Buffer} frame 
     * @param {number} energy 
     * @param {Object} settings 
     * @returns {Buffer}
     */
    applyCompression(frame, energy, settings) {
        const ratio = settings.compressionRatio || 3.0;
        const threshold = settings.compressionThreshold || 50;
        
        if (energy <= threshold) return frame;

        // Calculate compression factor
        const overage = energy - threshold;
        const compressionFactor = 1.0 - (overage / energy) * (1.0 - 1.0/ratio);

        // Apply compression
        const compressed = Buffer.from(frame);
        for (let i = 0; i < compressed.length; i++) {
            const centered = compressed[i] - 128;
            const newValue = Math.round(centered * compressionFactor) + 128;
            compressed[i] = Math.max(0, Math.min(255, newValue));
        }

        return compressed;
    }

    /**
     * Check if GSM frame appears corrupted
     * @param {Buffer} gsmFrame 
     * @returns {boolean}
     */
    isFrameCorrupted(gsmFrame) {
        // Simple corruption detection - check for unusual patterns
        let zeroCount = 0;
        let maxCount = 0;
        
        for (let i = 0; i < gsmFrame.length; i++) {
            if (gsmFrame[i] === 0) zeroCount++;
            if (gsmFrame[i] === 255) maxCount++;
        }

        // Frame is likely corrupted if too many zeros or max values
        return (zeroCount > 15 || maxCount > 15);
    }

    /**
     * Interpolate corrupted frame using simple techniques
     * @param {Buffer} corruptedFrame 
     * @param {Object} settings 
     * @returns {Buffer}
     */
    interpolateFrame(corruptedFrame, settings) {
        // Simple interpolation - use previous frame if available
        if (settings.previousFrame && settings.previousFrame.length === 33) {
            // Blend with previous frame for smoother transition
            const interpolated = Buffer.alloc(33);
            for (let i = 0; i < 33; i++) {
                interpolated[i] = Math.round((corruptedFrame[i] + settings.previousFrame[i]) / 2);
            }
            return interpolated;
        }

        // Fallback to comfort noise
        return this.generateComfortNoise();
    }

    /**
     * Apply adaptive jitter buffering to smooth audio delivery
     * @param {string} connectionId 
     * @param {Buffer} audioPacket 
     * @returns {Buffer|null}
     */
    applyJitterBuffering(connectionId, audioPacket) {
        const connection = this.connections.get(connectionId);
        if (!connection || !audioPacket) return audioPacket;

        const settings = connection.audioSettings;
        const now = Date.now();
        
        // Parse sequence number for ordering
        const sequenceNumber = audioPacket.readUInt16BE(6); // RTP sequence number at offset 2, but we have 4-byte header
        
        // Track packet timing for adaptive buffering
        if (settings.packetTiming.length > 0) {
            const lastTime = settings.packetTiming[settings.packetTiming.length - 1];
            const interval = now - lastTime;
            
            // Update average packet interval (moving average)
            settings.avgPacketInterval = (settings.avgPacketInterval * 0.9) + (interval * 0.1);
        }
        
        settings.packetTiming.push(now);
        if (settings.packetTiming.length > 10) {
            settings.packetTiming.shift(); // Keep only recent timings
        }

        // Detect if packet is out of order
        const isOutOfOrder = sequenceNumber < settings.lastSequence;
        if (!isOutOfOrder) {
            settings.lastSequence = sequenceNumber;
        }

        // Add to jitter buffer with timestamp
        const bufferEntry = {
            packet: audioPacket,
            sequence: sequenceNumber,
            arrivalTime: now,
            isOutOfOrder
        };
        
        // Insert in correct position if out of order
        if (isOutOfOrder) {
            const insertIndex = settings.jitterBuffer.findIndex(entry => entry.sequence > sequenceNumber);
            if (insertIndex === -1) {
                settings.jitterBuffer.push(bufferEntry);
            } else {
                settings.jitterBuffer.splice(insertIndex, 0, bufferEntry);
            }
        } else {
            settings.jitterBuffer.push(bufferEntry);
        }

        // Adaptive buffer size based on network conditions
        let targetBufferSize = settings.maxJitterBuffer;
        if (settings.adaptiveBuffer) {
            // Calculate jitter (variance in packet timing)
            const jitter = this.calculateJitter(settings.packetTiming);
            
            // Increase buffer size if high jitter detected
            if (jitter > 50) {
                targetBufferSize = Math.min(8, settings.maxJitterBuffer + 2);
            } else if (jitter < 20) {
                targetBufferSize = Math.max(3, settings.maxJitterBuffer - 1);
            }
        }

        // Output packets when buffer is sufficiently full
        if (settings.jitterBuffer.length >= targetBufferSize) {
            // Sort by sequence number
            settings.jitterBuffer.sort((a, b) => a.sequence - b.sequence);
            const output = settings.jitterBuffer.shift();
            
            // Check for gaps and generate interpolated packets if needed
            if (settings.jitterBuffer.length > 0) {
                const gap = settings.jitterBuffer[0].sequence - output.sequence;
                if (gap > 1) {
                    // Generate comfort noise for missing packets
                    for (let i = 1; i < gap && i < 3; i++) { // Limit interpolation
                        const interpolated = this.generateInterpolatedPacket(output.packet, settings);
                        if (interpolated) {
                            // Add interpolated packet to relay queue
                            this.schedulePacketRelay(connectionId, interpolated, 20 * i); // Stagger delivery
                        }
                    }
                }
            }
            
            return output.packet;
        }

        // Buffer not full yet - smooth delivery
        return null;
    }

    /**
     * Calculate network jitter from packet timing
     * @param {number[]} timings 
     * @returns {number}
     */
    calculateJitter(timings) {
        if (timings.length < 3) return 0;
        
        const intervals = [];
        for (let i = 1; i < timings.length; i++) {
            intervals.push(timings[i] - timings[i-1]);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => {
            const diff = interval - avgInterval;
            return sum + (diff * diff);
        }, 0) / intervals.length;
        
        return Math.sqrt(variance);
    }

    /**
     * Generate interpolated packet for gap filling
     * @param {Buffer} lastPacket 
     * @param {Object} settings 
     * @returns {Buffer|null}
     */
    generateInterpolatedPacket(lastPacket, settings) {
        if (!lastPacket || lastPacket.length !== 152) return null;
        
        // Create a copy of the last packet
        const interpolated = Buffer.from(lastPacket);
        
        // Modify sequence number (increment by 1)
        const lastSeq = interpolated.readUInt16BE(6);
        interpolated.writeUInt16BE(lastSeq + 1, 6);
        
        // Generate comfort noise for audio payload
        const comfortNoise = this.generateComfortNoise();
        for (let i = 0; i < 4; i++) {
            const frameStart = 16 + (i * 33); // Skip 4-byte header + 12-byte RTP header
            comfortNoise.copy(interpolated, frameStart);
        }
        
        return interpolated;
    }

    /**
     * Schedule packet for delayed relay (for gap filling)
     * @param {string} connectionId 
     * @param {Buffer} packet 
     * @param {number} delayMs 
     */
    schedulePacketRelay(connectionId, packet, delayMs) {
        setTimeout(() => {
            this.relayPaltalk5Audio(connectionId, packet);
        }, delayMs);
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
     * @param {Object} connection - Connection object for context
     * @returns {boolean}
     */
    isControlPacket(dataHex, connection = null) {
        // Log packet classification for debugging
        const packetInfo = {
            dataHex: dataHex.substring(0, 32),
            dataLength: dataHex.length / 2, // Convert hex length to bytes
            isAuthenticated: connection?.isAuthenticated || false,
            roomId: connection?.roomId || null
        };
        
        // If connection is authenticated, be very restrictive about control packets
        if (connection && connection.isAuthenticated) {
            // For authenticated connections, only very specific short control packets
            // Most packets should be audio data
            if (dataHex.length <= 16) { // 8 bytes or less = likely control
                logger.debug('Classified as control packet (authenticated, short)', {
                    ...packetInfo,
                    reason: 'authenticated_short',
                    module: 'voice'
                });
                return true;
            }
            
            // For authenticated connections, packets > 8 bytes should be audio
            logger.debug('Classified as audio packet (authenticated)', {
                ...packetInfo,
                reason: 'authenticated_long',
                module: 'voice'
            });
            return false;
        }
        
        // For unauthenticated connections, check for room join patterns
        // Room join packets are typically 8 bytes: 4 bytes room ID + 4 bytes user ID
        if (dataHex.length === 16) { // 8 bytes in hex (16 chars)
            logger.debug('Classified as control packet (room join)', {
                ...packetInfo,
                reason: 'room_join_8_bytes',
                module: 'voice'
            });
            return true;
        }
        
        // Check for 4-byte control packets
        if (dataHex.length === 8) { // 4 bytes in hex
            logger.debug('Classified as control packet (4 bytes)', {
                ...packetInfo,
                reason: 'control_4_bytes',
                module: 'voice'
            });
            return true;
        }
        
        // Check for longer room join control packets (12+ bytes)
        if (dataHex.length >= 24 && dataHex.length <= 32) { // 12-16 bytes
            logger.debug('Classified as control packet (extended format)', {
                ...packetInfo,
                reason: 'extended_control',
                module: 'voice'
            });
            return true;
        }
        
        // Audio packets are typically longer (>50 bytes)
        logger.debug('Classified as potential audio packet', {
            ...packetInfo,
            reason: 'default_audio',
            module: 'voice'
        });
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

        // Handle 8-byte room join packets (most common format)
        // Format: 4 bytes room ID + 4 bytes user ID
        if (data.length === 8 && !connection.isAuthenticated) {
            try {
                const roomId = data.readUInt32BE(0); // First 4 bytes = room ID
                const userId = data.readUInt32BE(4); // Next 4 bytes = user ID
                
                logger.info('Room join packet detected (8-byte format)', {
                    connectionId,
                    roomId,
                    userId,
                    dataHex,
                    module: 'voice'
                });
                
                this.authenticateAndJoinRoom(connectionId, roomId, userId);
                return;
            } catch (error) {
                logger.error('Error parsing 8-byte room join packet', error, {
                    connectionId,
                    dataHex,
                    module: 'voice'
                });
            }
        }

        // Handle 12+ byte room join control packets (various formats)
        if (data.length >= 12 && !connection.isAuthenticated) {
            try {
                const roomId = data.readUInt32BE(4);
                const userId = data.readUInt32BE(8);
                
                logger.info('Room join packet detected (12+ byte format)', {
                    connectionId,
                    roomId,
                    userId,
                    dataHex,
                    module: 'voice'
                });
                
                this.authenticateAndJoinRoom(connectionId, roomId, userId);
                return;
            } catch (error) {
                logger.error('Error parsing 12+ byte room join packet', error, {
                    connectionId,
                    dataHex,
                    module: 'voice'
                });
            }
        }

        // Handle other short control packets (4-12 bytes) for authenticated connections
        if (connection.isAuthenticated && data.length >= 4 && data.length <= 12) {
            logger.debug('Short control packet from authenticated connection', {
                connectionId,
                dataHex,
                module: 'voice'
            });
            
            // Send acknowledgment
            connection.socket.write(Buffer.from([0x00, 0x00, 0x00, 0x00]));
            return;
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

        // Remove from previous room if any
        if (connection.roomId) {
            logger.info('Removing connection from previous room', {
                connectionId,
                previousRoomId: connection.roomId,
                newRoomId: roomId,
                module: 'voice'
            });
            this.removeFromRoom(connectionId, connection.roomId);
        }

        // Join new room
        connection.roomId = roomId;
        connection.userId = userId;
        connection.isAuthenticated = true;
        connection.awaitingUserAssociation = false; // User is already associated

        // Add to room connections
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(connectionId);

        // Add to persistent room members
        if (!this.persistentRoomMembers.has(roomId)) {
            this.persistentRoomMembers.set(roomId, new Set());
            logger.info('Created new persistent voice room', {
                roomId,
                module: 'voice'
            });
        }
        
        const wasNewMember = !this.persistentRoomMembers.get(roomId).has(userId);
        this.persistentRoomMembers.get(roomId).add(userId);
        
        // Track user's active connection and activity
        this.userActiveConnections.set(userId, connectionId);
        this.userLastActivity.set(userId, Date.now());

        const actualRoomSize = this.persistentRoomMembers.get(roomId).size;

        if (wasNewMember) {
            logger.info('🎤 NEW USER JOINED VOICE ROOM!', {
                connectionId,
                roomId,
                userId,
                persistentRoomMembers: actualRoomSize,
                activeConnections: this.rooms.get(roomId).size,
                module: 'voice'
            });
        } else {
            logger.info('User reconnected to voice room', {
                connectionId,
                roomId,
                userId,
                persistentRoomMembers: actualRoomSize,
                activeConnections: this.rooms.get(roomId).size,
                module: 'voice'
            });
        }

        // Send join confirmation + UDP server info
        const confirmationBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
        connection.socket.write(confirmationBuffer);
        
        // Send UDP server info for audio relay
        const udpInfoBuffer = Buffer.alloc(6);
        udpInfoBuffer.writeUInt16BE(SERVER_CONFIG.VOICE_PORT + 1, 0); // UDP port
        udpInfoBuffer.writeUInt32BE(roomId, 2); // Room ID for reference
        connection.socket.write(udpInfoBuffer);
        
        logger.info('Sent TCP join confirmation + UDP server info', {
            connectionId,
            roomId,
            userId,
            roomSize: actualRoomSize,
            udpPort: SERVER_CONFIG.VOICE_PORT + 1,
            module: 'voice'
        });
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
        const persistentMembers = this.persistentRoomMembers.get(roomId);
        
        if (!roomConnections || !persistentMembers) return;

        logger.info('🎵 Attempting audio relay', {
            senderConnectionId,
            senderUserId: senderConnection.userId,
            roomId,
            activeConnections: roomConnections.size,
            persistentMembers: persistentMembers.size,
            persistentMemberIds: Array.from(persistentMembers),
            module: 'voice'
        });

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

        // Relay to all other users in the room (find their active connections)
        let relayCount = 0;
        let errorCount = 0;
        const targetUsers = [];

        persistentMembers.forEach(userId => {
            if (userId !== senderConnection.userId) {
                // Strategy 1: Try the tracked active connection
                let targetConnection = null;
                let targetConnectionId = this.userActiveConnections.get(userId);
                
                if (targetConnectionId) {
                    targetConnection = this.connections.get(targetConnectionId);
                }
                
                // Strategy 2: If no active connection, find ANY authenticated connection for this user
                if (!targetConnection || !targetConnection.socket.writable || !targetConnection.isAuthenticated) {
                    for (const [connId, conn] of this.connections) {
                        if (conn.userId === userId && conn.isAuthenticated && conn.socket.writable) {
                            targetConnection = conn;
                            targetConnectionId = connId;
                            // Update the tracking
                            this.userActiveConnections.set(userId, connId);
                            logger.debug('Found alternative active connection for user', {
                                userId,
                                newConnectionId: connId,
                                module: 'voice'
                            });
                            break;
                        }
                    }
                }
                
                if (targetConnection && targetConnection.socket.writable && targetConnection.isAuthenticated) {
                    targetUsers.push({
                        userId,
                        connectionId: targetConnectionId,
                        connection: targetConnection
                    });
                } else {
                    logger.debug('Target user has no active connection after search', {
                        targetUserId: userId,
                        trackedConnectionId: this.userActiveConnections.get(userId),
                        totalConnectionsForUser: Array.from(this.connections.values()).filter(c => c.userId === userId).length,
                        module: 'voice'
                    });
                }
            }
        });

        logger.info('Found target users for audio relay', {
            senderUserId: senderConnection.userId,
            targetUsers: targetUsers.map(u => ({ userId: u.userId, connectionId: u.connectionId })),
            module: 'voice'
        });

        targetUsers.forEach(({ userId, connectionId, connection }) => {
            try {
                // Send with proper Paltalk format: 4-byte length header + RTP packet
                this.sendRTPPacketToClient(connection.socket, processedData);
                connection.bytesSent += processedData.length + 4; // Include length header
                relayCount++;
                
                logger.info('Audio relayed to user', {
                    targetUserId: userId,
                    targetConnectionId: connectionId,
                    dataSize: processedData.length,
                    module: 'voice'
                });
            } catch (error) {
                logger.debug('Failed to relay audio to user', {
                    targetUserId: userId,
                    targetConnectionId: connectionId,
                    error: error.message,
                    module: 'voice'
                });
                errorCount++;
            }
        });

        // Update sender stats
        senderConnection.lastActivity = new Date();

        // Log relay statistics
        if (relayCount > 0) {
            logger.info('🎵 AUDIO RELAYED SUCCESSFULLY! 🎵', {
                senderConnectionId,
                roomId,
                relayCount,
                errorCount,
                dataSize: processedData.length,
                roomMemberCount: roomConnections.size,
                module: 'voice'
            });
        } else {
            logger.info('⚠️ No audio relayed - no other users in room', {
                senderConnectionId,
                roomId,
                roomConnectionsCount: roomConnections.size,
                reason: roomConnections.size <= 1 ? 'Only sender in room' : 'No valid target connections',
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
            // Extract RTP packet from received data (same logic as handleVoiceData)
            let rtpPacket;
            let extractionMethod = 'unknown';
            
            if (audioData.length >= 4) {
                // First check if this is direct RTP (starts with RTP version 2)
                if (audioData.length >= 12 && ((audioData.readUInt8(0) >> 6) & 0x03) === 2) {
                    // This is direct RTP
                    rtpPacket = audioData;
                    extractionMethod = 'direct_rtp';
                } else {
                    // Check for length header
                    const lengthHeader = audioData.readUInt32BE(0); // Try big-endian first
                    const lengthHeaderLE = audioData.readUInt32LE(0); // Also try little-endian
                    
                    // The length should be reasonable (not too big, not too small)
                    // For a 152-byte packet with 148-byte RTP, the header would be 0x00000094
                    if (lengthHeader > 0 && lengthHeader <= 1000 && audioData.length === lengthHeader + 4) {
                        // Big-endian length header
                        rtpPacket = audioData.slice(4);
                        extractionMethod = 'length_header_BE';
                    } else if (lengthHeaderLE > 0 && lengthHeaderLE <= 1000 && audioData.length === lengthHeaderLE + 4) {
                        // Little-endian length header
                        rtpPacket = audioData.slice(4);
                        extractionMethod = 'length_header_LE';
                    } else {
                        // No valid length header, assume direct RTP
                        rtpPacket = audioData;
                        extractionMethod = 'direct_no_header';
                    }
                }
            } else {
                rtpPacket = audioData;
                extractionMethod = 'direct_short';
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
            
            // Payload type validation - log but don't reject for now to debug
            if (rtpInfo.payloadType !== 3) {
                logger.warn('Non-standard payload type detected', {
                    payloadType: rtpInfo.payloadType,
                    expected: 3,
                    ssrc: rtpInfo.ssrc,
                    sequenceNumber: rtpInfo.sequenceNumber,
                    extractionMethod,
                    module: 'voice'
                });
                // For now, allow other payload types to debug the issue
                // return null;
            }

            // Validate audio payload size - log but be more flexible for debugging
            const headerSize = 12 + (rtpInfo.cc * 4); // Basic header + CSRC list
            const payloadSize = rtpPacket.length - headerSize;
            
            if (payloadSize < 136) {
                logger.warn('Audio payload smaller than expected', {
                    payloadSize,
                    expected: 136,
                    rtpPacketLength: rtpPacket.length,
                    headerSize,
                    extractionMethod,
                    module: 'voice'
                });
                // For now, allow smaller payloads to debug the issue
                // Only reject if payload is too small to be valid audio
                if (payloadSize < 20) {
                    logger.debug('Audio payload too small to be valid', {
                        payloadSize,
                        module: 'voice'
                    });
                    return null;
                }
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
        const connection = this.connections.get(connectionId);
        const roomConnections = this.rooms.get(roomId);
        
        if (roomConnections) {
            roomConnections.delete(connectionId);
            
            logger.info('Connection removed from room', {
                connectionId,
                roomId,
                userId: connection?.userId,
                remainingActiveConnections: roomConnections.size,
                module: 'voice'
            });
            
            // Only clean up the active connection room, NOT persistent membership
            if (roomConnections.size === 0) {
                this.rooms.delete(roomId);
                logger.info('No active connections in room (persistent members may remain)', { 
                    roomId, 
                    connectionId,
                    module: 'voice' 
                });
            }
        }
        
        // Note: We do NOT remove from persistentRoomMembers here
        // Users stay in persistent membership until they explicitly leave or timeout
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

        // Clean up keep-alive interval
        if (connection.keepAliveInterval) {
            clearInterval(connection.keepAliveInterval);
        }

        // Release speaker slot if this connection was the active speaker
        if (connection.roomId) {
            const speaker = this.activeSpeakers.get(connection.roomId);
            if (speaker && speaker.connectionId === connectionId) {
                logger.info('Releasing speaker slot - connection ended', {
                    connectionId,
                    roomId: connection.roomId,
                    speakerUserId: speaker.userId,
                    module: 'voice'
                });
                this.activeSpeakers.delete(connection.roomId);
            }
            
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

            // Very conservative cleanup - only remove connections that are clearly abandoned
            for (const [connectionId, connection] of this.connections) {
                const inactiveTime = now - connection.lastActivity;
                let shouldCleanup = false;
                let reason = '';
                
                // Only remove connections that are truly abandoned - either:
                // 1. Inactive for more than 30 minutes (very long time)
                // 2. User no longer in room AND inactive for more than 10 minutes
                if (inactiveTime > 30 * 60 * 1000) {
                    shouldCleanup = true;
                    reason = `inactive for ${Math.round(inactiveTime / 1000)}s (30+ minutes)`;
                }
                // Don't remove based on room presence during normal cleanup
                // This will be handled by explicit room leave events
                // Keeping this section disabled to prevent false positives
                
                if (shouldCleanup) {
                    logger.info('Cleaning up abandoned voice connection', { 
                        connectionId, 
                        reason,
                        userId: connection.userId,
                        roomId: connection.roomId,
                        inactiveTime: Math.round(inactiveTime / 1000),
                        module: 'voice'
                    });
                    
                    this.handleConnectionEnd(connectionId);
                    cleanedConnections++;
                }
            }

            // Clean up inactive speakers (release speaker slot after 3 seconds of silence)
            for (const [roomId, speaker] of this.activeSpeakers) {
                const silentTime = now - speaker.lastActivity;
                if (silentTime > 3000) { // 3 seconds of silence
                    logger.info('Releasing speaker slot due to silence', {
                        roomId,
                        speakerConnectionId: speaker.connectionId,
                        speakerUserId: speaker.userId,
                        silentTime: Math.round(silentTime / 1000),
                        module: 'voice'
                    });
                    this.activeSpeakers.delete(roomId);
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
     * Check if user is still in the chat room
     * @param {string} userId 
     * @param {string} roomId 
     * @returns {boolean}
     */
    isUserStillInChatRoom(userId, roomId) {
        if (!this.serverState) {
            logger.warn('ServerState not available for room check', { userId, roomId, module: 'voice' });
            return false;
        }
        
        try {
            // Get user from server state
            const user = this.serverState.getUser(userId);
            if (!user) {
                logger.info('Voice timeout check: User not found in server state', { userId, roomId, module: 'voice' });
                return false;
            }
            
            if (!user.isOnline()) {
                logger.info('Voice timeout check: User not online', { 
                    userId, 
                    roomId, 
                    userMode: user.mode,
                    hasSocket: !!user.socket,
                    module: 'voice' 
                });
                return false;
            }
            
            // Check if user is in the room
            const room = this.serverState.getRoom(roomId);
            if (!room) {
                logger.info('Voice timeout check: Room not found', { userId, roomId, module: 'voice' });
                return false;
            }
            
            if (!room.hasUser(userId)) {
                logger.info('Voice timeout check: Room does not have user', { 
                    userId, 
                    roomId, 
                    roomUserCount: room.users.size,
                    module: 'voice' 
                });
                return false;
            }
            
            // Double check from user perspective
            if (!user.isInRoom(roomId)) {
                logger.info('Voice timeout check: User not tracking room membership', { 
                    userId, 
                    roomId, 
                    userRooms: user.getRoomIds(),
                    module: 'voice' 
                });
                return false;
            }
            
            logger.debug('Voice timeout check: User still in room', { userId, roomId, module: 'voice' });
            return true;
        } catch (error) {
            logger.error('Error checking user room presence', error, { userId, roomId, module: 'voice' });
            return false;
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
     * Get audio quality optimization report
     * @returns {Object}
     */
    getAudioQualityReport() {
        const report = {
            totalConnections: this.connections.size,
            qualityEnhancementsActive: 0,
            averageJitterBufferSize: 0,
            compressionActive: 0,
            noiseGateActive: 0,
            recommendations: []
        };

        let totalJitterBuffer = 0;

        this.connections.forEach((connection, connectionId) => {
            const settings = connection.audioSettings;
            
            if (settings.qualityEnhancement) {
                report.qualityEnhancementsActive++;
            }
            
            if (settings.enableCompression) {
                report.compressionActive++;
            }
            
            if (settings.noiseGateThreshold > 0) {
                report.noiseGateActive++;
            }
            
            totalJitterBuffer += settings.jitterBuffer.length;
        });

        if (this.connections.size > 0) {
            report.averageJitterBufferSize = totalJitterBuffer / this.connections.size;
        }

        // Generate recommendations
        if (report.averageJitterBufferSize > 2) {
            report.recommendations.push('High jitter detected - consider network optimization');
        }
        
        if (report.qualityEnhancementsActive < this.connections.size * 0.8) {
            report.recommendations.push('Enable quality enhancements for more connections');
        }

        return report;
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

module.exports = MediaServer;
