/**
 * Enhanced Logger utility for the Paltalk server with packet logging capabilities
 */
const winston = require('winston');
const path = require('path');
const EventEmitter = require('events');
const { LOGGING_CONFIG } = require('../config/constants');
const { PACKET_TYPES } = require('../../PacketHeaders');

class Logger extends EventEmitter {
    constructor() {
        super();
        this.recentLogs = [];
        this.maxRecentLogs = 100;
        this.packetLogs = [];
        this.maxPacketLogs = 10000;
        this.packetSequence = 0;
        this.config = LOGGING_CONFIG;
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'paltalk-server' },
            transports: [
                new winston.transports.File({ 
                    filename: path.join(__dirname, '../../logs/error.log'), 
                    level: 'error' 
                }),
                new winston.transports.File({ 
                    filename: path.join(__dirname, '../../logs/combined.log') 
                }),
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
    }

    addToRecentLogs(level, message, meta = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            meta,
            id: Date.now() + Math.random()
        };
        
        this.recentLogs.unshift(logEntry);
        
        // Keep only the most recent logs
        if (this.recentLogs.length > this.maxRecentLogs) {
            this.recentLogs = this.recentLogs.slice(0, this.maxRecentLogs);
        }
        
        return logEntry;
    }

    /**
     * Get recent logs with optional filtering
     * @param {number} limit - Maximum number of logs to return
     * @param {string} module - Optional module filter (e.g., 'voice', 'chat')
     * @returns {Array} - Array of log entries
     */
    getRecentLogs(limit = 50, module = null) {
        let filtered = this.recentLogs;
        
        // Filter by module if specified
        if (module) {
            filtered = filtered.filter(log => {
                // Check both in message and metadata
                return (
                    (log.message && log.message.toLowerCase().includes(module.toLowerCase())) ||
                    (log.meta && log.meta.module === module) ||
                    (log.meta && log.meta.service && log.meta.service.includes(module))
                );
            });
        }
        
        // Limit results
        return filtered.slice(0, limit).map(log => ({
            id: log.id,
            timestamp: log.timestamp,
            level: log.level,
            message: log.message,
            details: log.meta
        }));
    }

    info(message, meta = {}) {
        this.logger.info(message, meta);
        this.addToRecentLogs('info', message, meta);
    }

    error(message, error = null, meta = {}) {
        const errorMeta = { error: error?.message || error, stack: error?.stack, ...meta };
        this.logger.error(message, errorMeta);
        this.addToRecentLogs('error', message, errorMeta);
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
        this.addToRecentLogs('warn', message, meta);
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
        this.addToRecentLogs('debug', message, meta);
    }

    // Enhanced packet logging methods
    logPacketReceived(packetType, payload, socketId, clientInfo = {}) {
        if (!this.config.PACKET_LOGGING.ENABLED) return;
        
        const direction = 'CLIENT→SERVER';
        const packetData = this.analyzePacket(packetType, payload, socketId, direction, clientInfo);
        
        this.debug('Packet received', {
            packetType,
            payloadLength: payload.length,
            socketId,
            direction,
            payloadHex: payload.toString('hex').substring(0, 100)
        });
        
        this.storePacketLog(packetData);
        this.emit('packetLogged', packetData);
    }

    logPacketSent(packetType, payload, socketId, clientInfo = {}) {
        if (!this.config.PACKET_LOGGING.ENABLED) return;
        
        const direction = 'SERVER→CLIENT';
        const packetData = this.analyzePacket(packetType, payload, socketId, direction, clientInfo);
        
        this.debug('Packet sent', {
            packetType,
            payloadLength: payload.length,
            socketId,
            direction,
            payloadHex: payload.toString('hex').substring(0, 100)
        });
        
        this.storePacketLog(packetData);
        this.emit('packetLogged', packetData);
    }

    analyzePacket(packetType, payload, socketId, direction, clientInfo = {}) {
        const timestamp = new Date().toISOString();
        const sequence = ++this.packetSequence;
        
        // Basic packet information
        const packetData = {
            id: `${timestamp}-${sequence}`,
            timestamp,
            sequence,
            direction,
            socketId,
            clientInfo,
            type: packetType,
            typeName: this.getPacketTypeName(packetType),
            size: payload.length,
            length: payload.length,
            rawBytes: payload.toString('hex'),
            summary: `${this.getPacketTypeName(packetType)} - ${payload.length} bytes`
        };

        // Add detailed analysis if enabled
        if (this.config.PACKET_LOGGING.DETAILED_ANALYSIS) {
            const header = this.analyzePacketHeader(payload);
            const payloadAnalysis = this.analyzePayload(payload);
            
            packetData.header = header;
            packetData.payload = payloadAnalysis;
            
            // Also add to details object for HTML compatibility
            packetData.details = {
                header: header,
                payload: payloadAnalysis
            };
        }

        return packetData;
    }

    analyzePacketHeader(buffer) {
        if (buffer.length < 4) {
            return { error: 'Buffer too small for header analysis' };
        }

        const header = {
            length: buffer.readUInt32LE(0),
            rawBytes: buffer.slice(0, Math.min(16, buffer.length)).toString('hex'),
            fields: []
        };

        // Extended header analysis for longer packets
        if (buffer.length >= 8) {
            header.fields.push({
                name: 'Length',
                offset: 0,
                value: header.length,
                hex: buffer.slice(0, 4).toString('hex'),
                description: 'Packet length field'
            });

            if (buffer.length >= 8) {
                header.fields.push({
                    name: 'Type/Command',
                    offset: 4,
                    value: buffer.readUInt32LE(4),
                    hex: buffer.slice(4, 8).toString('hex'),
                    description: 'Packet type or command identifier'
                });
            }
        }

        return header;
    }

    analyzePayload(buffer) {
        const maxDisplay = this.config.PACKET_LOGGING.MAX_PAYLOAD_DISPLAY || 512;
        const displayBuffer = buffer.slice(0, Math.min(maxDisplay, buffer.length));
        
        const payload = {
            length: buffer.length,
            displayLength: displayBuffer.length,
            truncated: buffer.length > maxDisplay,
            // Direct format properties for HTML compatibility
            hex: displayBuffer.toString('hex'),
            ascii: this.bufferToAscii(displayBuffer),
            binary: this.bufferToBinary(displayBuffer),
            decimal: Array.from(displayBuffer).join(' ')
        };

        // Also keep formats for backwards compatibility
        payload.formats = {
            hex: payload.hex,
            ascii: payload.ascii,
            binary: payload.binary,
            decimal: payload.decimal
        };

        // Try to detect structured data
        try {
            const structuredData = this.detectStructuredData(displayBuffer);
            if (structuredData) {
                payload.structured = structuredData;
            }
        } catch (error) {
            // Ignore structured data parsing errors
        }

        return payload;
    }

    bufferToAscii(buffer) {
        return Array.from(buffer)
            .map(byte => (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.')
            .join('');
    }

    bufferToBinary(buffer) {
        return Array.from(buffer)
            .map(byte => byte.toString(2).padStart(8, '0'))
            .join(' ');
    }

    detectStructuredData(buffer) {
        const data = {};
        
        // Try to detect strings
        const asciiText = this.bufferToAscii(buffer);
        const printableChars = asciiText.replace(/\./g, '').length;
        if (printableChars > buffer.length * 0.7) {
            data.possibleText = asciiText.trim();
        }

        // Try to detect null-terminated strings
        const nullIndex = buffer.indexOf(0);
        if (nullIndex > 0) {
            const nullTermString = buffer.slice(0, nullIndex).toString('ascii');
            if (nullTermString.length > 3) {
                data.nullTerminatedString = nullTermString;
            }
        }

        // Detect potential integers at common offsets
        if (buffer.length >= 4) {
            data.integers = {
                '0': buffer.readUInt32LE(0),
                '4': buffer.length >= 8 ? buffer.readUInt32LE(4) : null
            };
        }

        return Object.keys(data).length > 0 ? data : null;
    }

    getPacketTypeName(packetType) {
        // You can expand this with actual packet type mappings
        const typeNames = {
            0x01: 'CONNECT',
            0x02: 'DISCONNECT',
            0x03: 'CHAT_MESSAGE',
            0x04: 'ROOM_JOIN',
            0x05: 'ROOM_LEAVE',
            0x06: 'USER_LIST',
            0x07: 'PING',
            0x08: 'PONG'
        };
        
        return typeNames[packetType] || `UNKNOWN_${packetType}`;
    }

    shouldFilterPacket(packetType, direction) {
        const config = this.config.PACKET_LOGGING;
        
        // Check direction filter
        if (!config.LOG_DIRECTIONS.CLIENT_TO_SERVER && direction === 'CLIENT→SERVER') {
            return true;
        }
        if (!config.LOG_DIRECTIONS.SERVER_TO_CLIENT && direction === 'SERVER→CLIENT') {
            return true;
        }
        
        // Check exclude filter
        if (config.FILTER_PACKET_TYPES.includes(packetType)) {
            return true;
        }
        
        // Check include filter (if specified, only allow these types)
        if (config.INCLUDE_PACKET_TYPES.length > 0 && !config.INCLUDE_PACKET_TYPES.includes(packetType)) {
            return true;
        }
        
        return false;
    }

    storePacketLog(packetData) {
        this.packetLogs.unshift(packetData);
        
        // Keep only the most recent packet logs
        if (this.packetLogs.length > this.maxPacketLogs) {
            this.packetLogs = this.packetLogs.slice(0, this.maxPacketLogs);
        }
    }

    // API methods for web interface
    getPacketLogs(limit = 1000, offset = 0) {
        return this.packetLogs.slice(offset, offset + limit);
    }

    clearPacketLogs() {
        this.packetLogs = [];
        this.packetSequence = 0;
        this.info('Packet logs cleared');
    }

    getConfig() {
        return this.config;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.info('Logger configuration updated', newConfig);
    }

    logUserAction(action, userId, details = {}) {
        this.info(`User action: ${action}`, {
            userId,
            action,
            ...details
        });
    }

    logRoomActivity(action, roomId, userId, details = {}) {
        this.info(`Room activity: ${action}`, {
            roomId,
            userId,
            action,
            ...details
        });
    }
}

// Create a singleton instance
const logger = new Logger();

module.exports = logger;
