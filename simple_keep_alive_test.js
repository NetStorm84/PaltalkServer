#!/usr/bin/env node

const net = require('net');

console.log('🔍 Simple KEEP_ALIVE test...');

const socket = net.createConnection(5001, 'localhost');

socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Create packet type 13 manually
    const header = Buffer.alloc(6);
    header.writeInt16BE(13, 0);      // packet type 13 (KEEP_ALIVE)
    header.writeInt16BE(29, 2);      // version
    header.writeUInt16BE(4, 4);      // payload length
    
    const payload = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD]);
    const packet = Buffer.concat([header, payload]);
    
    console.log('📤 Sending KEEP_ALIVE packet type 13...');
    console.log('   Packet hex:', packet.toString('hex'));
    
    socket.write(packet);
    
    setTimeout(() => {
        console.log('✅ KEEP_ALIVE packet sent successfully');
        console.log('📋 Check server logs for debug message');
        socket.destroy();
        process.exit(0);
    }, 1000);
});

socket.on('error', (err) => {
    console.log('❌ Connection error:', err.message);
    process.exit(1);
});

socket.on('data', (data) => {
    console.log('📥 Server response:', data.toString('hex'));
});

socket.on('close', () => {
    console.log('🔌 Connection closed');
});
