/**
 * Enhanced packet sender with better error handling and logging
 */
const Buffer = require('buffer').Buffer;
const logger = require('../utils/logger');

class PacketSender {
    constructor() {
        this.outgoingVersion = 29;
    }

    /**
     * Send a packet to a socket
     * @param {Socket} socket - The socket to send the packet to
     * @param {number} packetType - The type of packet to send
     * @param {Buffer} payload - The payload of the packet
     * @param {string} socketId - Optional socket identifier for logging
     */
    sendPacket(socket, packetType, payload, socketId = 'unknown') {
        try {
            if (!socket || !socket.writable) {
                logger.warn('Attempted to send packet to invalid socket', { 
                    packetType, 
                    socketId 
                });
                return false;
            }

            // Ensure payload is a Buffer
            if (!Buffer.isBuffer(payload)) {
                payload = Buffer.from(payload);
            }

            // Create packet header
            const header = Buffer.alloc(6);
            header.writeInt16BE(packetType, 0);
            header.writeInt16BE(this.outgoingVersion, 2);
            header.writeUInt16BE(payload.length, 4);

            // Combine header and payload
            const packet = Buffer.concat([header, payload]);

            // Send the packet
            socket.write(packet);

            // Log the packet
            logger.logPacketSent(packetType, payload, socketId);

            return true;
        } catch (error) {
            logger.error('Failed to send packet', error, {
                packetType,
                socketId,
                payloadLength: payload?.length || 0
            });
            return false;
        }
    }

    /**
     * Broadcast a packet to multiple sockets
     * @param {Array<Socket>} sockets - Array of sockets to send to
     * @param {number} packetType - The type of packet to send
     * @param {Buffer} payload - The payload of the packet
     * @param {Socket} excludeSocket - Optional socket to exclude from broadcast
     */
    broadcastPacket(sockets, packetType, payload, excludeSocket = null) {
        let successCount = 0;
        let totalCount = 0;

        sockets.forEach(socket => {
            if (socket && socket !== excludeSocket) {
                totalCount++;
                if (this.sendPacket(socket, packetType, payload, socket.id)) {
                    successCount++;
                }
            }
        });

        logger.debug('Broadcast completed', {
            packetType,
            successCount,
            totalCount,
            payloadLength: payload.length
        });

        return { successCount, totalCount };
    }
}

// Create singleton instance
const packetSender = new PacketSender();

module.exports = {
    sendPacket: packetSender.sendPacket.bind(packetSender),
    broadcastPacket: packetSender.broadcastPacket.bind(packetSender),
    PacketSender
};
