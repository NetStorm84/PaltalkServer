const { sendPacket } = require('./packetSender');  // Assume this exists

/**
 * Process incoming packets based on their types.
 * @param {Socket} socket - The socket from which the packet was received.
 * @param {number} packetType - The type of packet received.
 * @param {Buffer} payload - The payload of the packet.
 */
async function processPacket(socket, packetType, payload) {
    switch (packetType) {
        case PACKET_TYPES.CLIENT_HELLO:
            handleClientHello(socket, payload);
            break;
        case PACKET_TYPES.GET_UIN:
            await handleGetUIN(socket, payload);
            break;
        case PACKET_TYPES.ADD_PAL:
            await handleAddPal(socket, payload);
            break;
        default:
            console.log(`No handler for packet type: ${packetType}`);
            break;
    }
}

function handleClientHello(socket, payload) {
    console.log(`Received Client Hello from ${socket.remoteAddress}`);
    const responsePayload = Buffer.from("Hello Client!");
    sendPacket(socket, PACKET_TYPES.HELLO, responsePayload);
}

async function handleGetUIN(socket, payload) {
    const uid = payload.readInt32BE(0);
    // Simulate fetching user info from a database
    const userInfo = {
        uid: uid,
        nickname: 'NetStorm',
    };
    const responseString = `uid=${userInfo.uid}\nnickname=${userInfo.nickname}\n`;
    sendPacket(socket, PACKET_TYPES.UIN_RESPONSE, Buffer.from(responseString));
}

async function handleAddPal(socket, payload) {
    const uidToAdd = payload.readInt32BE(0);
    console.log(`Adding pal UID: ${uidToAdd}`);
    // Here you would add the pal to the user's buddy list in the database
    const successPayload = Buffer.from('Pal added successfully');
    sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, successPayload);
}

module.exports = { processPacket };
