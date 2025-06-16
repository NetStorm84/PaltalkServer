#!/usr/bin/env node

/**
 * Debug script to test addBuddy functionality
 */

const net = require('net');
const { PACKET_TYPES } = require('./PacketHeaders');

console.log('🔍 Debugging addBuddy function...');

const socket = net.createConnection(5001, 'localhost');

socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Simple login flow
    const loginData = Buffer.from('nickname=Dan\npassword=test123\n');
    
    // Create packet
    const header = Buffer.alloc(6);
    header.writeInt16BE(PACKET_TYPES.LOGIN, 0);
    header.writeInt16BE(29, 2);
    header.writeUInt16BE(loginData.length, 4);
    
    const packet = Buffer.concat([header, loginData]);
    socket.write(packet);
    
    console.log('📤 Sent login packet');
    
    // After a delay, try to add a buddy
    setTimeout(() => {
        console.log('👥 Attempting to add buddy UID 1000002 (NetStorm)...');
        
        const buddyUid = Buffer.alloc(4);
        buddyUid.writeUInt32BE(1000002, 0);
        
        const buddyHeader = Buffer.alloc(6);
        buddyHeader.writeInt16BE(PACKET_TYPES.ADD_PAL, 0);
        buddyHeader.writeInt16BE(29, 2);
        buddyHeader.writeUInt16BE(4, 4);
        
        const buddyPacket = Buffer.concat([buddyHeader, buddyUid]);
        socket.write(buddyPacket);
        
        console.log('📤 Sent ADD_PAL packet for UID 1000002');
        
        // Try adding the same buddy again to see if it returns false
        setTimeout(() => {
            console.log('👥 Attempting to add the SAME buddy again...');
            socket.write(buddyPacket);
            console.log('📤 Sent duplicate ADD_PAL packet for UID 1000002');
            
            setTimeout(() => {
                console.log('🏁 Test complete - check server logs');
                socket.destroy();
                process.exit(0);
            }, 2000);
        }, 2000);
    }, 3000);
});

socket.on('data', (data) => {
    if (data.length >= 6) {
        const packetType = data.readInt16BE(0);
        console.log(`📥 Received packet type: ${packetType}`);
        
        if (packetType === PACKET_TYPES.BUDDY_LIST) {
            console.log('📋 Received BUDDY_LIST update');
        }
    }
});

socket.on('error', (err) => {
    console.log('❌ Error:', err.message);
    process.exit(1);
});

socket.on('close', () => {
    console.log('🔌 Connection closed');
});
