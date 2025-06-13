
const { PACKET_TYPES } = require('./PacketHeaders');
const { sendPacket } = require('./packetSender');

// Simple user storage
const users = new Map();
let userIdCounter = 1000000;

async function processPacket(socket, packetType, payload) {
    console.log(`Processing packet type: ${packetType}, payload: ${payload.toString('hex')}`);
    
    try {
        switch (packetType) {
            case PACKET_TYPES.LYMERICK:
                handleLymerick(socket, payload);
                break;
                
            case PACKET_TYPES.LOGIN:
                handleLogin(socket, payload);
                break;
                
            case PACKET_TYPES.STATUS_CHANGE:
                handleStatusChange(socket, payload);
                break;
                
            case PACKET_TYPES.GET_UIN:
                handleGetUin(socket, payload);
                break;
                
            default:
                console.log(`Unhandled packet type: ${packetType}`);
                break;
        }
    } catch (error) {
        console.error('Error processing packet:', error);
    }
}

function handleLymerick(socket, payload) {
    console.log('Lymerick received');
    // Send back a simple acknowledgment
    const response = Buffer.alloc(4);
    response.writeUInt32BE(0, 0);
    sendPacket(socket, PACKET_TYPES.LYMERICK, response);
}

function handleLogin(socket, payload) {
    console.log('Login packet received');
    
    // Parse login data (simplified)
    // In real implementation, you'd parse username, password, etc.
    const userId = userIdCounter++;
    
    // Store user info
    users.set(socket, {
        id: userId,
        nickname: 'TestUser' + userId,
        mode: 30, // ONLINE
        socket: socket
    });
    
    // Send login success response
    const loginResponse = Buffer.alloc(8);
    loginResponse.writeUInt32BE(userId, 0);
    loginResponse.writeUInt32BE(1, 4); // Success flag
    sendPacket(socket, PACKET_TYPES.LOGIN, loginResponse);
    
    console.log(`User ${userId} logged in successfully`);
}

function handleStatusChange(socket, payload) {
    const user = users.get(socket);
    if (user && payload.length >= 4) {
        const newMode = payload.readUInt32BE(0);
        user.mode = newMode;
        console.log(`User ${user.id} changed mode to ${newMode}`);
        
        // Echo back the status change
        sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, payload);
    }
}

function handleGetUin(socket, payload) {
    const user = users.get(socket);
    if (user) {
        const response = Buffer.alloc(4);
        response.writeUInt32BE(user.id, 0);
        sendPacket(socket, PACKET_TYPES.UIN_RESPONSE, response);
    }
}

module.exports = { processPacket };