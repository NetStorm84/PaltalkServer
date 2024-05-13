// packetSender.js
const Buffer = require('buffer').Buffer;

/**
 * Sends a packet to a socket with the specified packet type and payload.
 * @param {Socket} socket - The socket to send the packet to.
 * @param {number} packetType - The type of packet to send.
 * @param {Buffer} payload - The payload of the packet.
 */
function sendPacket(socket, packetType, payload) {
    const header = Buffer.alloc(6);
    header.writeInt16BE(packetType, 0);
    header.writeUInt16BE(payload.length, 4);
    const packet = Buffer.concat([header, payload]);
    socket.write(packet);
    console.log(`Sent packet of type ${packetType} with payload ${payload.toString('hex')}`);
}

module.exports = { sendPacket };
