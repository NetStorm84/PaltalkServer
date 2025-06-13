/**
 * Logger utility for the Paltalk server
 */
const winston = require('winston');
const path = require('path');

class Logger {
    constructor() {
        this.recentLogs = [];
        this.maxRecentLogs = 100;
        
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

    getRecentLogs(limit = 50) {
        return this.recentLogs.slice(0, limit);
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

    // Special methods for packet logging
    logPacketReceived(packetType, payload, socketId) {
        this.debug('Packet received', {
            packetType,
            payloadLength: payload.length,
            socketId,
            payloadHex: payload.toString('hex').substring(0, 100) // Truncate for readability
        });
    }

    logPacketSent(packetType, payload, socketId) {
        this.debug('Packet sent', {
            packetType,
            payloadLength: payload.length,
            socketId,
            payloadHex: payload.toString('hex').substring(0, 100)
        });
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
