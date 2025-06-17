#!/usr/bin/env node

/**
 * Test script to simulate room message broadcasting
 * This script connects multiple clients to the server and tests message broadcasting
 */

const net = require('net');
const { PACKET_TYPES } = require('../PacketHeaders');

// Test configuration
const SERVER_HOST = 'localhost';
const SERVER_PORT = 5001;
const TEST_ROOM_ID = 10001; // Welcome Hall

// Test users
const testUsers = [
    { uid: 1000004, nickname: 'Dan', password: 'test123' },
    { uid: 1000002, nickname: 'NetStorm', password: 'test123' }
];

class TestClient {
    constructor(user) {
        this.user = user;
        this.socket = null;
        this.isLoggedIn = false;
        this.isInRoom = false;
        this.receivedMessages = [];
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = new net.Socket();
            
            this.socket.connect(SERVER_PORT, SERVER_HOST, () => {
                console.log(`${this.user.nickname}: Connected to server`);
                this.setupEventHandlers();
                resolve();
            });
            
            this.socket.on('error', (error) => {
                console.error(`${this.user.nickname}: Connection error:`, error);
                reject(error);
            });
        });
    }

    setupEventHandlers() {
        this.socket.on('data', (data) => {
            this.handleData(data);
        });
        
        this.socket.on('close', () => {
            console.log(`${this.user.nickname}: Connection closed`);
        });
    }

    handleData(buffer) {
        let offset = 0;
        
        while (offset < buffer.length) {
            if (buffer.length - offset < 6) break; // Need at least header
            
            const packetLength = buffer.readUInt16BE(offset);
            const packetType = buffer.readInt16BE(offset + 2);
            
            if (buffer.length - offset < packetLength) break; // Incomplete packet
            
            const payload = buffer.slice(offset + 6, offset + packetLength);
            
            console.log(`${this.user.nickname}: Received packet type: 0x${packetType.toString(16).padStart(4, '0')} (${packetType}), length: ${packetLength}`);
            
            this.handlePacket(packetType, payload);
            
            offset += packetLength;
        }
    }

    handlePacket(packetType, payload) {
        switch (packetType) {
            case PACKET_TYPES.LOGIN:
                console.log(`${this.user.nickname}: Login response received`);
                this.isLoggedIn = true;
                break;
                
            case PACKET_TYPES.ROOM_MESSAGE_IN:
                this.handleRoomMessage(payload);
                break;
                
            case 0x0136: // Room join success
                console.log(`${this.user.nickname}: Successfully joined room`);
                this.isInRoom = true;
                break;
                
            default:
                // console.log(`${this.user.nickname}: Unhandled packet type: 0x${packetType.toString(16)}`);
                break;
        }
    }

    handleRoomMessage(payload) {
        try {
            const roomId = payload.readUInt32BE(0);
            const senderId = payload.readUInt32BE(4);
            const message = payload.slice(8).toString('utf8');
            
            this.receivedMessages.push({
                roomId,
                senderId,
                message,
                timestamp: new Date()
            });
            
            console.log(`${this.user.nickname}: Received room message from ${senderId}: "${message}"`);
        } catch (error) {
            console.error(`${this.user.nickname}: Error parsing room message:`, error);
        }
    }

    sendPacket(packetType, payload = Buffer.alloc(0)) {
        const header = Buffer.allocUnsafe(6);
        header.writeUInt16BE(payload.length + 6, 0); // Total packet length
        header.writeInt16BE(packetType, 2);
        header.writeUInt16BE(0, 4); // Unknown/reserved
        
        const packet = Buffer.concat([header, payload]);
        this.socket.write(packet);
    }

    async login() {
        return new Promise((resolve) => {
            // Step 1: Get UIN (User ID) by nickname
            const getUinPayload = Buffer.concat([
                Buffer.alloc(4), // 4 bytes padding
                Buffer.from(this.user.nickname, 'utf8')
            ]);
            this.sendPacket(PACKET_TYPES.GET_UIN, getUinPayload);
            
            setTimeout(() => {
                // Step 2: Send lymerick (required by server)
                this.sendPacket(PACKET_TYPES.LYMERICK);
                
                setTimeout(() => {
                    // Step 3: Send login packet with UID
                    const loginPayload = Buffer.alloc(4);
                    loginPayload.writeUInt32BE(this.user.uid, 0);
                    this.sendPacket(PACKET_TYPES.LOGIN, loginPayload);
                    
                    // Wait for login response
                    const checkLogin = () => {
                        if (this.isLoggedIn) {
                            console.log(`${this.user.nickname}: Login successful`);
                            resolve();
                        } else {
                            setTimeout(checkLogin, 100);
                        }
                    };
                    setTimeout(checkLogin, 1000);
                }, 100);
            }, 100);
        });
    }

    async joinRoom(roomId = TEST_ROOM_ID) {
        return new Promise((resolve) => {
            // Create room join payload (room ID + flags)
            const payload = Buffer.alloc(10);
            payload.writeUInt32BE(roomId, 0);
            payload.writeUInt16BE(0, 4); // flags (not invisible)
            payload.writeUInt32BE(0x082a, 6); // additional data
            
            this.sendPacket(PACKET_TYPES.ROOM_JOIN, payload);
            
            // Wait for room join confirmation
            const checkJoin = () => {
                if (this.isInRoom) {
                    console.log(`${this.user.nickname}: Successfully joined room ${roomId}`);
                    resolve();
                } else {
                    setTimeout(checkJoin, 100);
                }
            };
            setTimeout(checkJoin, 500);
        });
    }

    sendRoomMessage(message, roomId = TEST_ROOM_ID) {
        const roomIdBuffer = Buffer.alloc(4);
        roomIdBuffer.writeUInt32BE(roomId, 0);
        const messageBuffer = Buffer.from(message, 'utf8');
        const payload = Buffer.concat([roomIdBuffer, messageBuffer]);
        
        this.sendPacket(PACKET_TYPES.ROOM_MESSAGE_OUT, payload);
        console.log(`${this.user.nickname}: Sent room message: "${message}"`);
    }

    disconnect() {
        if (this.socket) {
            this.socket.end();
        }
    }
}

async function runTest() {
    console.log('🧪 Starting room message broadcast test...\n');
    
    const clients = testUsers.map(user => new TestClient(user));
    
    try {
        // Connect all clients
        console.log('📡 Connecting clients...');
        for (const client of clients) {
            await client.connect();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Login all clients
        console.log('\n🔐 Logging in clients...');
        for (const client of clients) {
            await client.login();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Join room with all clients
        console.log('\n🏠 Joining room...');
        for (const client of clients) {
            await client.joinRoom();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Wait a moment for everything to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send test messages
        console.log('\n💬 Testing message broadcasting...');
        
        // Dan sends a message
        clients[0].sendRoomMessage('Hello from Dan!');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // NetStorm sends a message  
        clients[1].sendRoomMessage('Hi Dan, this is NetStorm!');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Dan sends another message
        clients[0].sendRoomMessage('Great to see you NetStorm!');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check results
        console.log('\n📊 Test Results:');
        clients.forEach(client => {
            console.log(`\n${client.user.nickname} received ${client.receivedMessages.length} messages:`);
            client.receivedMessages.forEach((msg, index) => {
                console.log(`  ${index + 1}. From user ${msg.senderId}: "${msg.message}"`);
            });
        });
        
        // Analyze results
        const totalMessagesSent = 3;
        const expectedMessagesPerUser = totalMessagesSent - 1; // Each user shouldn't receive their own messages
        
        console.log('\n🔍 Analysis:');
        let testPassed = true;
        
        clients.forEach(client => {
            const receivedCount = client.receivedMessages.length;
            const expected = expectedMessagesPerUser;
            const passed = receivedCount === expected;
            
            console.log(`${client.user.nickname}: Received ${receivedCount}/${expected} messages - ${passed ? '✅ PASS' : '❌ FAIL'}`);
            
            if (!passed) {
                testPassed = false;
            }
        });
        
        console.log(`\n🎯 Overall Test Result: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
        
        if (!testPassed) {
            console.log('\n🐛 Issue detected: Message broadcasting is not working correctly');
            console.log('Users are not receiving messages from other users in the same room');
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        clients.forEach(client => client.disconnect());
        
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

// Run the test
runTest().catch(console.error);
