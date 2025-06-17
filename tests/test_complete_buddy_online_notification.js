#!/usr/bin/env node

/**
 * COMPREHENSIVE TEST: Online Buddy Notification System
 * 
 * This test demonstrates that when a user comes online, it properly notifies
 * everyone who has that user on their buddy list through the event-driven system.
 * 
 * Test Flow:
 * 1. Dan logs in first
 * 2. Dan adds NetStorm as buddy (NetStorm is offline - should show offline)
 * 3. NetStorm logs in (should trigger userConnected event)
 * 4. Dan should receive STATUS_CHANGE notification that NetStorm is now online
 */

const net = require('net');
const { PACKET_TYPES } = require('../PacketHeaders');

console.log('🧪 Testing Complete Online Buddy Notification System\n');

// Test state
let danSocket, netstormSocket;
let danLoggedIn = false;
let netstormLoggedIn = false;
let buddyAdded = false;
let statusUpdateReceived = false;

function createPacket(packetType, payload = Buffer.alloc(0)) {
    const header = Buffer.alloc(6);
    header.writeInt16BE(packetType, 0);
    header.writeUInt16BE(0, 2); // version
    header.writeUInt16BE(payload.length, 4);
    return Buffer.concat([header, payload]);
}

function handleServerData(data, clientName) {
    if (data.length >= 6) {
        const packetType = data.readInt16BE(0);
        const payloadLength = data.readUInt16BE(4);
        const payload = data.slice(6, 6 + payloadLength);
        
        // Enhanced logging for status changes
        if (packetType === PACKET_TYPES.STATUS_CHANGE) {
            if (payload.length >= 8) {
                const uid = payload.readUInt32BE(0);
                const status = payload.readUInt32BE(4);
                const statusText = status === 30 ? '🟢 ONLINE' : 
                                 status === 70 ? '🟡 AWAY' : '🔴 OFFLINE';
                console.log(`[${clientName}] 📊 🎉 BUDDY STATUS UPDATE: User ${uid} is now ${statusText}`);
                
                // Check if this is the expected notification
                if (clientName === 'Dan' && uid === 1000002 && status === 30) {
                    statusUpdateReceived = true;
                    console.log('[Dan] ✅ SUCCESS: Received online notification for NetStorm when NetStorm came online!');
                }
            }
        }
    }
}

async function loginUser(socket, nickname, uid) {
    return new Promise((resolve, reject) => {
        let step = 0;
        
        const dataHandler = (data) => {
            if (data.length < 6) return;
            
            const packetType = data.readInt16BE(0);
            console.log(`[${nickname}] 📥 Received packet type: ${packetType}`);
            
            // Handle status updates for Dan
            if (nickname === 'Dan') {
                handleServerData(data, nickname);
            }
            
            switch (step) {
                case 0:
                    if (packetType === PACKET_TYPES.HELLO) {
                        step = 1;
                        const getUinPayload = Buffer.concat([
                            Buffer.alloc(4),
                            Buffer.from(nickname, 'utf8')
                        ]);
                        socket.write(createPacket(PACKET_TYPES.GET_UIN, getUinPayload));
                        console.log(`[${nickname}] 🆔 Requested UID for nickname: ${nickname}`);
                    }
                    break;
                    
                case 1:
                    if (packetType === PACKET_TYPES.UIN_RESPONSE) {
                        step = 2;
                        socket.write(createPacket(PACKET_TYPES.LYMERICK, Buffer.alloc(0)));
                        console.log(`[${nickname}] 🔑 Sent LYMERICK`);
                    }
                    break;
                    
                case 2:
                    if (packetType === PACKET_TYPES.LOGIN_NOT_COMPLETE) {
                        step = 3;
                        console.log(`[${nickname}] ⏳ Received LOGIN_NOT_COMPLETE`);
                    }
                    break;
                    
                case 3:
                    if (packetType === PACKET_TYPES.SERVER_KEY) {
                        step = 4;
                        const loginPayload = Buffer.alloc(4);
                        loginPayload.writeUInt32BE(uid, 0);
                        socket.write(createPacket(PACKET_TYPES.LOGIN, loginPayload));
                        console.log(`[${nickname}] ✅ Sent LOGIN with UID: ${uid}`);
                    }
                    break;
                    
                case 4:
                    if (packetType === PACKET_TYPES.LOGIN) {
                        step = 5;
                        console.log(`[${nickname}] ✅ Login successful!`);
                        socket.removeListener('data', dataHandler);
                        if (nickname === 'Dan') {
                            // Keep listening for status updates
                            socket.on('data', (data) => handleServerData(data, nickname));
                        }
                        resolve();
                    }
                    break;
            }
        };
        
        socket.on('data', dataHandler);
        socket.on('error', reject);
        
        // Start login sequence
        console.log(`[${nickname}] 👋 Starting login sequence...`);
        socket.write(createPacket(PACKET_TYPES.CLIENT_HELLO, Buffer.from('Hello')));
    });
}

async function runTest() {
    try {
        // Step 1: Connect Dan
        console.log('📡 Step 1: Connecting Dan...');
        danSocket = net.createConnection(5001, 'localhost');
        await new Promise((resolve, reject) => {
            danSocket.on('connect', () => {
                console.log('[Dan] ✅ Connected to server');
                resolve();
            });
            danSocket.on('error', reject);
        });
        
        // Step 2: Log Dan in
        console.log('\n🔐 Step 2: Logging Dan in...');
        await loginUser(danSocket, 'Dan', 1000004);
        danLoggedIn = true;
        console.log('[Dan] ✅ Dan logged in successfully');
        
        // Step 3: Dan adds NetStorm as buddy (NetStorm is offline)
        console.log('\n👥 Step 3: Dan adding NetStorm as buddy (NetStorm is offline)...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for login to stabilize
        
        const buddyUid = Buffer.alloc(4);
        buddyUid.writeUInt32BE(1000002, 0); // NetStorm's UID
        danSocket.write(createPacket(PACKET_TYPES.ADD_PAL, buddyUid));
        console.log('[Dan] 👥 Sent ADD_PAL for NetStorm (UID 1000002)');
        console.log('[Dan] 📴 NetStorm should appear as OFFLINE since NetStorm is not logged in yet');
        buddyAdded = true;
        
        // Wait for buddy addition to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 4: Connect NetStorm (this should trigger online notification to Dan)
        console.log('\n📡 Step 4: Connecting NetStorm (this should notify Dan)...');
        netstormSocket = net.createConnection(5001, 'localhost');
        await new Promise((resolve, reject) => {
            netstormSocket.on('connect', () => {
                console.log('[NetStorm] ✅ Connected to server');
                resolve();
            });
            netstormSocket.on('error', reject);
        });
        
        // Step 5: Log NetStorm in (this should trigger userConnected event)
        console.log('\n🔐 Step 5: Logging NetStorm in (should trigger online notification to Dan)...');
        await loginUser(netstormSocket, 'NetStorm', 1000002);
        netstormLoggedIn = true;
        console.log('[NetStorm] ✅ NetStorm logged in successfully');
        console.log('\n⏱️  Waiting for Dan to receive online notification...');
        
        // Step 6: Wait for status update
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 7: Verify results
        console.log('\n📊 TEST RESULTS:');
        console.log(`✅ Dan logged in: ${danLoggedIn}`);
        console.log(`✅ Dan added NetStorm as buddy: ${buddyAdded}`);
        console.log(`✅ NetStorm logged in: ${netstormLoggedIn}`);
        console.log(`${statusUpdateReceived ? '✅' : '❌'} Dan received online notification: ${statusUpdateReceived}`);
        
        if (statusUpdateReceived) {
            console.log('\n🎉 SUCCESS: Online buddy notification system is working correctly!');
            console.log('When NetStorm came online, Dan was properly notified via the event-driven system.');
        } else {
            console.log('\n❌ ISSUE: Dan did not receive the online notification for NetStorm.');
            console.log('This suggests the userConnected event or broadcastStatusChange is not working.');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    } finally {
        // Cleanup
        setTimeout(() => {
            console.log('\n🧹 Cleaning up connections...');
            danSocket?.destroy();
            netstormSocket?.destroy();
            process.exit(0);
        }, 2000);
    }
}

// Run the test
runTest();
