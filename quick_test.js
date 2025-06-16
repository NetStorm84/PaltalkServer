#!/usr/bin/env node

const net = require('net');
const { PACKET_TYPES } = require('./PacketHeaders');

console.log('🔍 Quick verification test...');

// Check if packet type 13 is defined
console.log('📦 PACKET_TYPES.KEEP_ALIVE =', PACKET_TYPES.KEEP_ALIVE);

// Quick connection test
const socket = net.createConnection(5001, 'localhost');

socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Create packet type 13
    const header = Buffer.alloc(6);
    header.writeInt16BE(13, 0);      // packet type 13
    header.writeInt16BE(29, 2);      // version
    header.writeUInt16BE(4, 4);      // payload length
    
    const payload = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD]);
    const packet = Buffer.concat([header, payload]);
    
    console.log('📤 Sending packet type 13...');
    socket.write(packet);
    
    setTimeout(() => {
        console.log('✅ Test completed');
        socket.destroy();
        process.exit(0);
    }, 1000);
});

socket.on('error', (err) => {
    console.log('❌ Error:', err.message);
    process.exit(1);
});

socket.on('data', (data) => {
    console.log('📥 Received response:', data.toString('hex'));
});
