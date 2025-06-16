#!/usr/bin/env node

/**
 * Quick test for packet type 13 (KEEP_ALIVE) handling
 */

const net = require('net');
const { PACKET_TYPES } = require('./PacketHeaders');

const SERVER_HOST = 'localhost';
const SERVER_PORT = 5001;
const PROTOCOL_VERSION = 29;

function createPacket(packetType, payload = Buffer.alloc(0)) {
    const header = Buffer.alloc(6);
    header.writeInt16BE(packetType, 0);
    header.writeInt16BE(PROTOCOL_VERSION, 2);
    header.writeUInt16BE(payload.length, 4);
    return Buffer.concat([header, payload]);
}

async function testPacketType13() {
    console.log('💓 Testing packet type 13 (KEEP_ALIVE) handling...\n');

    const socket = net.createConnection(SERVER_PORT, SERVER_HOST);
    
    socket.on('connect', () => {
        console.log('✅ Connected to server');
        
        // Send packet type 13 with sample data
        const payload = Buffer.from([0x01, 0x02, 0x03, 0x04]);
        const packet = createPacket(13, payload);
        
        console.log('📤 Sending packet type 13 (KEEP_ALIVE) with payload:', payload.toString('hex'));
        socket.write(packet);
        
        // Send a few more to test stability
        setTimeout(() => {
            console.log('📤 Sending second KEEP_ALIVE packet');
            socket.write(createPacket(13, Buffer.from([0x05, 0x06])));
        }, 500);
        
        setTimeout(() => {
            console.log('📤 Sending third KEEP_ALIVE packet');
            socket.write(createPacket(13, Buffer.from([0x07, 0x08, 0x09])));
        }, 1000);
        
        // Clean up after 2 seconds
        setTimeout(() => {
            console.log('✅ Test completed successfully!');
            console.log('📝 Check server logs for KEEP_ALIVE debug messages');
            socket.destroy();
            process.exit(0);
        }, 2000);
    });

    socket.on('error', (err) => {
        console.error('❌ Socket error:', err.message);
        process.exit(1);
    });

    socket.on('close', () => {
        console.log('🔌 Disconnected from server');
    });
}

testPacketType13().catch(err => {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
});
