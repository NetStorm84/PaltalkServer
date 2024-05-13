// packetReceiver.js
const Buffer = require('buffer').Buffer;

/**
 * Processes incoming data from a socket, handling buffer concatenation and packet extraction.
 * @param {Buffer} data - The incoming chunk of data from the socket.
 * @param {Map} currentSockets - A map of current socket connections for state management.
 * @param {function} processPacket - Function to call for processing complete packets.
 */
function receivePacket(socket, data, currentSockets, processPacket) {
    // Retrieve or initialize the receive buffer for the current socket
    let recvBuffer = currentSockets.get(socket.id) ? currentSockets.get(socket.id).recvBuffer : Buffer.alloc(0);

    // Concatenate new data to the existing buffer
    recvBuffer = Buffer.concat([recvBuffer, data]);

    while (recvBuffer.length >= 6) { // Ensure there's enough buffer to read a packet header
        const packetType = recvBuffer.readInt16BE(0);
        const length = recvBuffer.readUInt16BE(4);

        // Check if the full packet has been received
        if (recvBuffer.length < length + 6) {
            console.log('Data received is not complete');
            break; // Wait for more data
        }

        // Extract the packet
        const packetPayload = recvBuffer.slice(6, length + 6);

        // Process the packet
        processPacket(socket, packetType, packetPayload);

        // Slice the processed packet out of the buffer
        recvBuffer = recvBuffer.slice(length + 6);
    }

    // Update the buffer in currentSockets map
    if (currentSockets.get(socket.id)) {
        currentSockets.get(socket.id).recvBuffer = recvBuffer;
    } else {
        currentSockets.set(socket.id, { user: null, socket: socket, recvBuffer: recvBuffer });
    }
}

module.exports = { receivePacket };
