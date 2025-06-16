/**
 * Simple buddy status test to demonstrate the functionality
 */

const net = require('net');
const PACKET_TYPES = require('../PacketHeaders').PACKET_TYPES;

function createTestClient(nickname) {
    let socket = null;
    let uid = null;
    
    function connect() {
        return new Promise((resolve, reject) => {
            socket = net.createConnection(5001, 'localhost');
            
            socket.on('connect', () => {
                console.log(`[${nickname}] ✅ Connected to server`);
                resolve();
            });

            socket.on('data', (data) => {
                handleData(data);
            });

            socket.on('error', (err) => {
                console.error(`[${nickname}] ❌ Connection error:`, err.message);
                reject(err);
            });

            socket.on('close', () => {
                console.log(`[${nickname}] 🔌 Disconnected from server`);
            });
        });
    }
    
    function handleData(data) {
        if (data.length >= 6) {
            const packetType = data.readInt16BE(0);
            const version = data.readInt16BE(2);
            const payloadLength = data.readUInt16BE(4);
            
            if (data.length >= 6 + payloadLength) {
                const payload = data.slice(6, 6 + payloadLength);
                
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
                        console.log(`[${nickname}] 👥 Buddy list received`);
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
                    
                    default:
                        // Uncomment to see all packets
                        // console.log(`[${nickname}] 📦 Packet: ${packetType} (${payload.length} bytes)`);
                        break;
                }
            }
        }
    }

    function sendPacket(packetType, payload) {
        const header = Buffer.alloc(6);
        header.writeInt16BE(packetType, 0);
        header.writeInt16BE(29, 2); // version
        header.writeUInt16BE(payload.length, 4);
        
        const packet = Buffer.concat([header, payload]);
        socket.write(packet);
    }

    function login() {
        console.log(`[${nickname}] 🔐 Starting login sequence...`);
        
        // Step 1: Send CLIENT_HELLO
        sendPacket(PACKET_TYPES.CLIENT_HELLO, Buffer.alloc(0));
        console.log(`[${nickname}] 👋 Sent CLIENT_HELLO`);
        
        // Step 2: Wait for HELLO response, then send GET_UIN
        setTimeout(() => {
            const getUinPayload = Buffer.concat([
                Buffer.alloc(4), // 4 bytes padding as per old implementation
                Buffer.from(nickname, 'utf8')
            ]);
            sendPacket(PACKET_TYPES.GET_UIN, getUinPayload);
            console.log(`[${nickname}] 🆔 Requested UID for nickname: ${nickname}`);
            
            // Step 3: Wait for UIN_RESPONSE, then send LYMERICK
            setTimeout(() => {
                sendPacket(PACKET_TYPES.LYMERICK, Buffer.alloc(0));
                console.log(`[${nickname}] 🔑 Sent LYMERICK`);
                
                // Step 4: Wait for LOGIN_NOT_COMPLETE + SERVER_KEY, then send LOGIN with UID
                setTimeout(() => {
                    if (uid) {
                        const loginPayload = Buffer.alloc(4);
                        loginPayload.writeUInt32BE(uid, 0);
                        sendPacket(PACKET_TYPES.LOGIN, loginPayload);
                        console.log(`[${nickname}] ✅ Sent LOGIN with UID: ${uid}`);
                    } else {
                        console.log(`[${nickname}] ❌ No UID received, cannot complete login`);
                    }
                }, 1000);
            }, 1000);
        }, 1000);
    }

    function addBuddy(buddyUid) {
        const buddyBuffer = Buffer.alloc(4);
        buddyBuffer.writeUInt32BE(buddyUid, 0);
        sendPacket(PACKET_TYPES.ADD_PAL, buddyBuffer);
        console.log(`[${nickname}] 👥 Adding buddy with UID: ${buddyUid}`);
    }

    function setAwayMode() {
        sendPacket(PACKET_TYPES.AWAY_MODE, Buffer.alloc(0));
        console.log(`[${nickname}] 🌙 Setting away mode`);
    }

    function setOnlineMode() {
        sendPacket(PACKET_TYPES.ONLINE_MODE, Buffer.alloc(0));
        console.log(`[${nickname}] ☀️ Setting online mode`);
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
        setAwayMode,
        setOnlineMode,
        disconnect,
        getUid: () => uid
    };
}

async function demonstrateBuddyStatus() {
    console.log('🧪 Demonstrating Enhanced Buddy Status System\n');
    
    const dan = createTestClient('Dan');
    const netstorm = createTestClient('NetStorm');
    
    try {
        // Connect both clients
        console.log('📡 Connecting clients...');
        await dan.connect();
        await netstorm.connect();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Login both users and wait for completion
        console.log('\n🔐 Logging in users...');
        dan.login();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for Dan to complete login
        
        netstorm.login();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for NetStorm to complete login
        
        // Now both users should be fully logged in
        console.log('\n👥 Dan adds NetStorm as buddy...');
        dan.addBuddy(1000002);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // NetStorm goes away
        console.log('\n🌙 NetStorm goes away...');
        netstorm.setAwayMode();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // NetStorm comes back online
        console.log('\n☀️ NetStorm comes back online...');
        netstorm.setOnlineMode();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // NetStorm disconnects (offline status)
        console.log('\n📴 NetStorm disconnects...');
        netstorm.disconnect();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n✅ Test completed! Dan should have seen NetStorm\'s status changes.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        dan.disconnect();
        netstorm.disconnect();
    }
}

// Run the demonstration
if (require.main === module) {
    demonstrateBuddyStatus().then(() => {
        console.log('\n🎉 Buddy status demonstration finished!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Demo error:', error);
        process.exit(1);
    });
}

module.exports = { createTestClient, demonstrateBuddyStatus };
