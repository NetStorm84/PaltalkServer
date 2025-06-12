/**
 * Logger utility for the Paltalk server
 */
const winston = require('winston');
const path = require('path');

class Logger {
    constructor() {
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

    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    error(message, error = null, meta = {}) {
        this.logger.error(message, { error: error?.message || error, stack: error?.stack, ...meta });
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
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
