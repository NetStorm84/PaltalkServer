#!/usr/bin/env node

/**
 * Test to verify online buddy status is correctly detected and sent
 */

const net = require('net');
const { PACKET_TYPES } = require('./PacketHeaders');

console.log('🧪 Testing online buddy status detection...\n');

// Create two connections
const dan = net.createConnection(5001, 'localhost');
const netStorm = net.createConnection(5001, 'localhost');

let danLoggedIn = false;
let netStormLoggedIn = false;

function createPacket(packetType, payload = Buffer.alloc(0)) {
    const header = Buffer.alloc(6);
    header.writeInt16BE(packetType, 0);
    header.writeInt16BE(29, 2);
    header.writeUInt16BE(payload.length, 4);
    return Buffer.concat([header, payload]);
}

function loginSequence(socket, nickname, callback) {
    let step = 0;
    
    socket.on('data', (data) => {
        if (data.length < 6) return;
        
        const packetType = data.readInt16BE(0);
        
        if (packetType === PACKET_TYPES.HELLO && step === 0) {
            step = 1;
            // Send GET_UIN
            const getUinPayload = Buffer.concat([
                Buffer.alloc(4), // padding
                Buffer.from(nickname, 'utf8')
            ]);
            socket.write(createPacket(PACKET_TYPES.GET_UIN, getUinPayload));
            console.log(`[${nickname}] 🆔 Requested UID for nickname: ${nickname}`);
            
        } else if (packetType === PACKET_TYPES.UIN_RESPONSE && step === 1) {
            step = 2;
            const uidMatch = data.toString('utf8').match(/uid=(\d+)/);
            if (uidMatch) {
                const uid = parseInt(uidMatch[1]);
                console.log(`[${nickname}] 🆔 Received UID: ${uid}`);
                
                // Send LYMERICK
                socket.write(createPacket(PACKET_TYPES.LYMERICK, Buffer.alloc(0)));
                console.log(`[${nickname}] 🔑 Sent LYMERICK`);
            }
            
        } else if (packetType === PACKET_TYPES.LOGIN_NOT_COMPLETE && step === 2) {
            step = 3;
            console.log(`[${nickname}] ⏳ Received LOGIN_NOT_COMPLETE`);
            
        } else if (packetType === PACKET_TYPES.SERVER_KEY && step === 3) {
            step = 4;
            // Now login with UID
            const uidMatch = netStormUID || danUID;
            const uid = nickname === 'Dan' ? 1000004 : 1000002;
            const loginPayload = Buffer.alloc(4);
            loginPayload.writeUInt32BE(uid, 0);
            
            socket.write(createPacket(PACKET_TYPES.LOGIN, loginPayload));
            console.log(`[${nickname}] ✅ Sent LOGIN with UID: ${uid}`);
            
        } else if (packetType === PACKET_TYPES.LOGIN && step === 4) {
            console.log(`[${nickname}] ✅ Login successful!`);
            callback();
            
        } else if (packetType === PACKET_TYPES.STATUS_CHANGE) {
            const buddyUid = data.readUInt32BE(6);
            const statusHex = data.slice(10, 14).toString('hex');
            const status = statusHex === '0000001e' ? '🟢 ONLINE' : 
                          statusHex === '00000046' ? '🟡 AWAY' : '🔴 OFFLINE';
            console.log(`[${nickname}] 📊 BUDDY STATUS UPDATE: User ${buddyUid} is now ${status}`);
        }
    });
}

// Login Dan
dan.on('connect', () => {
    console.log('[Dan] ✅ Connected to server');
    dan.write(createPacket(PACKET_TYPES.CLIENT_HELLO, Buffer.from('Hello')));
    console.log('[Dan] 👋 Sent CLIENT_HELLO');
});

loginSequence(dan, 'Dan', () => {
    danLoggedIn = true;
    checkBothLoggedIn();
});

// Login NetStorm
netStorm.on('connect', () => {
    console.log('[NetStorm] ✅ Connected to server');
    netStorm.write(createPacket(PACKET_TYPES.CLIENT_HELLO, Buffer.from('Hello')));
    console.log('[NetStorm] 👋 Sent CLIENT_HELLO');
});

loginSequence(netStorm, 'NetStorm', () => {
    netStormLoggedIn = true;
    checkBothLoggedIn();
});

function checkBothLoggedIn() {
    if (danLoggedIn && netStormLoggedIn) {
        console.log('\n👥 Both users logged in. Dan will now add NetStorm as buddy...');
        
        // Wait a bit for login to complete
        setTimeout(() => {
            const buddyUid = Buffer.alloc(4);
            buddyUid.writeUInt32BE(1000002, 0); // NetStorm's UID
            
            dan.write(createPacket(PACKET_TYPES.ADD_PAL, buddyUid));
            console.log('[Dan] 👥 Sent ADD_PAL for NetStorm (UID 1000002)');
            console.log('[Dan] 📋 NetStorm should appear as 🟢 ONLINE since NetStorm is currently logged in');
            
            // End test after 3 seconds
            setTimeout(() => {
                console.log('\n🏁 Test complete');
                dan.destroy();
                netStorm.destroy();
                process.exit(0);
            }, 3000);
        }, 1000);
    }
}

dan.on('error', (err) => console.log('[Dan] ❌ Error:', err.message));
netStorm.on('error', (err) => console.log('[NetStorm] ❌ Error:', err.message));
