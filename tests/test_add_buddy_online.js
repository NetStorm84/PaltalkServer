#!/usr/bin/env node

/**
 * Test script to debug add buddy functionality with online users
 */

const net = require('net');
const { PACKET_TYPES } = require('../PacketHeaders');

console.log('🔍 Testing ADD_BUDDY with online users...\n');

function createPacket(packetType, payload = Buffer.alloc(0)) {
    const header = Buffer.alloc(6);
    header.writeInt16BE(packetType, 0);
    header.writeInt16BE(29, 2);
    header.writeUInt16BE(payload.length, 4);
    return Buffer.concat([header, payload]);
}

function handleServerData(data, clientName) {
    if (data.length >= 6) {
        const packetType = data.readInt16BE(0);
        const payloadLength = data.readUInt16BE(4);
        const payload = data.slice(6, 6 + payloadLength);
        
        console.log(`[${clientName}] 📥 Received packet type: ${packetType}`);
        
        if (packetType === PACKET_TYPES.STATUS_CHANGE) {
            if (payload.length >= 8) {
                const uid = payload.readUInt32BE(0);
                const status = payload.readUInt32BE(4);
                const statusText = status === 30 ? '🟢 ONLINE' : 
                                 status === 70 ? '🟡 AWAY' : '🔴 OFFLINE';
                console.log(`[${clientName}] 📊 BUDDY STATUS UPDATE: User ${uid} is now ${statusText}`);
            }
        }
    }
}

async function testAddBuddyWithOnlineUser() {
    const danSocket = net.createConnection(5001, 'localhost');
    const netstormSocket = net.createConnection(5001, 'localhost');
    
    let danLoggedIn = false;
    let netstormLoggedIn = false;
    
    danSocket.on('connect', () => {
        console.log('[Dan] ✅ Connected to server');
        
        // Login Dan
        const helloPacket = createPacket(PACKET_TYPES.CLIENT_HELLO);
        danSocket.write(helloPacket);
    });
    
    netstormSocket.on('connect', () => {
        console.log('[NetStorm] ✅ Connected to server');
        
        // Login NetStorm
        const helloPacket = createPacket(PACKET_TYPES.CLIENT_HELLO);
        netstormSocket.write(helloPacket);
    });
    
    danSocket.on('data', (data) => {
        handleServerData(data, 'Dan');
        
        if (data.length >= 6) {
            const packetType = data.readInt16BE(0);
            
            if (packetType === PACKET_TYPES.HELLO && !danLoggedIn) {
                console.log('[Dan] 🆔 Requesting UID...');
                const uinPacket = createPacket(PACKET_TYPES.GET_UIN, Buffer.from('Dan'));
                danSocket.write(uinPacket);
            }
            
            if (packetType === PACKET_TYPES.UIN_RESPONSE && !danLoggedIn) {
                console.log('[Dan] 🔑 Sending LYMERICK...');
                const lymerickPacket = createPacket(PACKET_TYPES.LYMERICK);
                danSocket.write(lymerickPacket);
            }
            
            if (packetType === PACKET_TYPES.LOGIN_NOT_COMPLETE && !danLoggedIn) {
                console.log('[Dan] ✅ Logging in with UID 1000004...');
                const loginData = Buffer.alloc(4);
                loginData.writeUInt32BE(1000004, 0);
                const loginPacket = createPacket(PACKET_TYPES.LOGIN, loginData);
                danSocket.write(loginPacket);
                danLoggedIn = true;
            }
            
            if (packetType === PACKET_TYPES.USER_DATA && danLoggedIn && netstormLoggedIn) {
                console.log('\n👥 Both users logged in. Dan will now add NetStorm as buddy...');
                setTimeout(() => {
                    const buddyUid = Buffer.alloc(4);
                    buddyUid.writeUInt32BE(1000002, 0); // NetStorm's UID
                    const addBuddyPacket = createPacket(PACKET_TYPES.ADD_PAL, buddyUid);
                    danSocket.write(addBuddyPacket);
                    console.log('[Dan] 👥 Sent ADD_PAL packet for NetStorm (UID 1000002)');
                }, 1000);
            }
        }
    });
    
    netstormSocket.on('data', (data) => {
        handleServerData(data, 'NetStorm');
        
        if (data.length >= 6) {
            const packetType = data.readInt16BE(0);
            
            if (packetType === PACKET_TYPES.HELLO && !netstormLoggedIn) {
                console.log('[NetStorm] 🆔 Requesting UID...');
                const uinPacket = createPacket(PACKET_TYPES.GET_UIN, Buffer.from('NetStorm'));
                netstormSocket.write(uinPacket);
            }
            
            if (packetType === PACKET_TYPES.UIN_RESPONSE && !netstormLoggedIn) {
                console.log('[NetStorm] 🔑 Sending LYMERICK...');
                const lymerickPacket = createPacket(PACKET_TYPES.LYMERICK);
                netstormSocket.write(lymerickPacket);
            }
            
            if (packetType === PACKET_TYPES.LOGIN_NOT_COMPLETE && !netstormLoggedIn) {
                console.log('[NetStorm] ✅ Logging in with UID 1000002...');
                const loginData = Buffer.alloc(4);
                loginData.writeUInt32BE(1000002, 0);
                const loginPacket = createPacket(PACKET_TYPES.LOGIN, loginData);
                netstormSocket.write(loginPacket);
                netstormLoggedIn = true;
            }
        }
    });
    
    danSocket.on('error', (err) => console.log('[Dan] ❌ Error:', err.message));
    netstormSocket.on('error', (err) => console.log('[NetStorm] ❌ Error:', err.message));
    
    // Clean up after test
    setTimeout(() => {
        console.log('\n🏁 Test complete - check server logs for debug info');
        danSocket.destroy();
        netstormSocket.destroy();
        process.exit(0);
    }, 10000);
}

testAddBuddyWithOnlineUser().catch(err => {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
});
