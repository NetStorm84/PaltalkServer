#!/usr/bin/env node

/**
 * Test script to demonstrate remove buddy functionality
 */

const net = require('net');
const { PACKET_TYPES } = require('../PacketHeaders');

console.log('🧪 Testing Remove Buddy Functionality');
console.log('=====================================\n');

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

function createTestClient(nickname) {
    let socket = null;
    let uid = null;
    
    function connect() {
        return new Promise((resolve, reject) => {
            socket = net.createConnection(SERVER_PORT, SERVER_HOST);
            
            socket.on('connect', () => {
                console.log(`[${nickname}] ✅ Connected to server`);
                resolve();
            });
            
            socket.on('error', (err) => {
                console.error(`[${nickname}] ❌ Connection error:`, err.message);
                reject(err);
            });
            
            socket.on('data', handleData);
        });
    }
    
    function handleData(data) {
        let offset = 0;
        
        while (offset < data.length) {
            if (data.length - offset < 6) break;
            
            const packetType = data.readInt16BE(offset);
            const version = data.readInt16BE(offset + 2);
            const payloadLength = data.readUInt16BE(offset + 4);
            
            if (data.length - offset < 6 + payloadLength) break;
            
            const payload = data.slice(offset + 6, offset + 6 + payloadLength);
            offset += 6 + payloadLength;
            
            switch (packetType) {
                case PACKET_TYPES.HELLO:
                    console.log(`[${nickname}] 👋 Received HELLO from server`);
                    break;
                
                case PACKET_TYPES.UIN_RESPONSE:
                    const response = payload.toString('utf8');
                    const uidMatch = response.match(/uid=(\d+)/);
                    if (uidMatch) {
                        uid = parseInt(uidMatch[1]);
                        console.log(`[${nickname}] 🆔 Received UID: ${uid}`);
                    }
                    break;
                
                case PACKET_TYPES.LOGIN_NOT_COMPLETE:
                    console.log(`[${nickname}] ⏳ Received LOGIN_NOT_COMPLETE`);
                    break;
                
                case PACKET_TYPES.SERVER_KEY:
                    const serverKey = payload.toString('utf8');
                    console.log(`[${nickname}] 🔑 Received SERVER_KEY: ${serverKey.substring(0, 10)}...`);
                    break;
                
                case PACKET_TYPES.LOGIN:
                    if (payload.length >= 8) {
                        const loginUid = payload.readUInt32BE(0);
                        const successFlag = payload.readUInt32BE(4);
                        if (successFlag === 1) {
                            console.log(`[${nickname}] ✅ Login successful! UID: ${loginUid}`);
                        } else {
                            console.log(`[${nickname}] ❌ Login failed`);
                        }
                    }
                    break;
                
                case PACKET_TYPES.USER_DATA:
                    console.log(`[${nickname}] 📊 Received USER_DATA`);
                    break;
                
                case PACKET_TYPES.BUDDY_LIST:
                    console.log(`[${nickname}] 👥 Buddy list updated`);
                    // Parse and display buddy list
                    if (payload.length > 0) {
                        const buddyListStr = payload.toString('utf8');
                        const buddies = buddyListStr.split('\xC8').filter(b => b.length > 0);
                        console.log(`[${nickname}] 📋 Current buddies (${buddies.length}):`);
                        buddies.forEach(buddy => {
                            const uidMatch = buddy.match(/uid=(\d+)/);
                            const nickMatch = buddy.match(/nickname=([^\n]+)/);
                            if (uidMatch && nickMatch) {
                                console.log(`[${nickname}]   - ${nickMatch[1]} (UID: ${uidMatch[1]})`);
                            }
                        });
                    } else {
                        console.log(`[${nickname}] 📋 Buddy list is empty`);
                    }
                    break;
                
                case PACKET_TYPES.STATUS_CHANGE:
                    if (payload.length >= 8) {
                        const userUid = payload.readUInt32BE(0);
                        const statusHex = payload.slice(4, 8).toString('hex');
                        
                        let statusText = 'unknown';
                        switch (statusHex) {
                            case '0000001e':
                                statusText = '🟢 ONLINE';
                                break;
                            case '00000046':
                                statusText = '🟡 AWAY';
                                break;
                            case '00000000':
                                statusText = '🔴 OFFLINE';
                                break;
                        }
                        
                        console.log(`[${nickname}] 📊 BUDDY STATUS UPDATE: User ${userUid} is now ${statusText}`);
                    }
                    break;
            }
        }
    }

    function sendPacket(packetType, payload) {
        const packet = createPacket(packetType, payload);
        socket.write(packet);
    }

    function login() {
        // Start login sequence
        console.log(`[${nickname}] 🔐 Starting login sequence...`);
        
        // Step 1: CLIENT_HELLO
        sendPacket(PACKET_TYPES.CLIENT_HELLO, Buffer.alloc(0));
        console.log(`[${nickname}] 👋 Sent CLIENT_HELLO`);
        
        setTimeout(() => {
            // Step 2: GET_UIN
            const uinPayload = Buffer.from('000000000' + nickname, 'utf8');
            sendPacket(PACKET_TYPES.GET_UIN, uinPayload);
            console.log(`[${nickname}] 🆔 Requested UID for nickname: ${nickname}`);
            
            setTimeout(() => {
                // Step 3: LYMERICK  
                sendPacket(PACKET_TYPES.LYMERICK, Buffer.alloc(0));
                console.log(`[${nickname}] 🔑 Sent LYMERICK`);
                
                setTimeout(() => {
                    // Step 4: LOGIN with UID
                    if (uid) {
                        const loginPayload = Buffer.from(`nickname=${nickname}\nuid=${uid}\n`, 'utf8');
                        sendPacket(PACKET_TYPES.LOGIN, loginPayload);
                        console.log(`[${nickname}] ✅ Sent LOGIN with UID: ${uid}`);
                    }
                }, 1000);
            }, 1000);
        }, 1000);
    }

    function addBuddy(buddyUid) {
        const buddyBuffer = Buffer.alloc(4);
        buddyBuffer.writeUInt32BE(buddyUid, 0);
        sendPacket(PACKET_TYPES.ADD_PAL, buddyBuffer);
        console.log(`[${nickname}] ➕ Adding buddy with UID: ${buddyUid}`);
    }

    function removeBuddy(buddyUid) {
        const buddyBuffer = Buffer.alloc(4);
        buddyBuffer.writeUInt32BE(buddyUid, 0);
        sendPacket(PACKET_TYPES.REMOVE_PAL, buddyBuffer);
        console.log(`[${nickname}] ➖ Removing buddy with UID: ${buddyUid}`);
    }

    function disconnect() {
        if (socket) {
            socket.end();
        }
    }

    return {
        connect,
        login,
        addBuddy,
        removeBuddy,
        disconnect,
        getUid: () => uid
    };
}

async function testRemoveBuddyFunctionality() {
    console.log('📡 Creating test client...');
    
    const dan = createTestClient('Dan');
    
    try {
        // Connect and login
        await dan.connect();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        dan.login();
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('\n🧪 TESTING REMOVE BUDDY FUNCTIONALITY\n');
        
        // Test 1: Add a buddy first
        console.log('📝 Step 1: Adding NetStorm as buddy...');
        dan.addBuddy(1000002);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test 2: Try to add the same buddy again (should return false)
        console.log('📝 Step 2: Trying to add the same buddy again (should fail)...');
        dan.addBuddy(1000002);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test 3: Remove the buddy
        console.log('📝 Step 3: Removing NetStorm from buddy list...');
        dan.removeBuddy(1000002);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test 4: Try to add the buddy again (should work now)
        console.log('📝 Step 4: Adding NetStorm again (should work now)...');
        dan.addBuddy(1000002);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('✅ Remove buddy functionality test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        dan.disconnect();
        setTimeout(() => process.exit(0), 1000);
    }
}

// Run the test
testRemoveBuddyFunctionality().catch(err => {
    console.error('❌ Test error:', err.message);
    process.exit(1);
});
