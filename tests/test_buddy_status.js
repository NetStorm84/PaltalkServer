/**
 * Test script to demonstrate enhanced buddy status functionality
 * This simulates buddy status updates when users come online/offline and change modes
 */

const net = require('net');
const PACKET_TYPES = require('../PacketHeaders').PACKET_TYPES;

class PaltalkTestClient {
    constructor(nickname, buddies = []) {
        this.nickname = nickname;
        this.buddies = buddies;
        this.socket = null;
        this.uid = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection(5001, 'localhost');
            
            this.socket.on('connect', () => {
                console.log(`[${this.nickname}] Connected to server`);
                resolve();
            });

            this.socket.on('data', (data) => {
                this.handleData(data);
            });

            this.socket.on('error', (err) => {
                console.error(`[${this.nickname}] Connection error:`, err.message);
                reject(err);
            });

            this.socket.on('close', () => {
                console.log(`[${this.nickname}] Disconnected from server`);
            });
        });
    }

    handleData(data) {
        // Simple packet parsing for demonstration
        if (data.length >= 8) {
            const packetType = data.readInt32BE(4);
            
            switch (packetType) {
                case PACKET_TYPES.STATUS_CHANGE:
                    if (data.length >= 16) {
                        const userUid = data.readUInt32BE(8);
                        const statusHex = data.slice(12, 16).toString('hex');
                        
                        let statusText = 'unknown';
                        switch (statusHex) {
                            case '0000001e':
                                statusText = 'online';
                                break;
                            case '00000046':
                                statusText = 'away';
                                break;
                            case '00000000':
                                statusText = 'offline';
                                break;
                        }
                        
                        console.log(`[${this.nickname}] 🟢 BUDDY STATUS UPDATE: User ${userUid} is now ${statusText} (${statusHex})`);
                    }
                    break;
                
                case PACKET_TYPES.LOGIN:
                    if (data.length >= 16) {
                        this.uid = data.readUInt32BE(8);
                        console.log(`[${this.nickname}] ✅ Login successful, UID: ${this.uid}`);
                    }
                    break;
                
                case PACKET_TYPES.BUDDY_LIST:
                    console.log(`[${this.nickname}] 📋 Received buddy list`);
                    break;
                
                default:
                    console.log(`[${this.nickname}] 📦 Received packet type: ${packetType} (length: ${data.length})`);
                    break;
            }
        }
    }

    login() {
        const loginData = `nickname=${this.nickname}\npassword=test123\n`;
        this.sendPacket(PACKET_TYPES.LOGIN, Buffer.from(loginData));
    }

    addBuddy(buddyUid) {
        const buddyBuffer = Buffer.alloc(4);
        buddyBuffer.writeUInt32BE(buddyUid, 0);
        this.sendPacket(PACKET_TYPES.ADD_PAL, buddyBuffer);
        console.log(`[${this.nickname}] 👥 Adding buddy with UID: ${buddyUid}`);
    }

    setAwayMode() {
        this.sendPacket(PACKET_TYPES.AWAY_MODE, Buffer.alloc(0));
        console.log(`[${this.nickname}] 🌙 Setting away mode`);
    }

    setOnlineMode() {
        this.sendPacket(PACKET_TYPES.ONLINE_MODE, Buffer.alloc(0));
        console.log(`[${this.nickname}] ☀️ Setting online mode`);
    }

    sendPacket(packetType, payload) {
        const header = Buffer.alloc(8);
        header.writeUInt32BE(payload.length, 0);
        header.writeInt32BE(packetType, 4);
        
        const packet = Buffer.concat([header, payload]);
        this.socket.write(packet);
    }

    disconnect() {
        if (this.socket) {
            this.socket.end();
        }
    }
}

async function testBuddyStatusSystem() {
    console.log('🧪 Testing Enhanced Buddy Status System\n');
    
    // Create test clients
    const dan = new PaltalkTestClient('Dan');
    const netstorm = new PaltalkTestClient('NetStorm');
    
    try {
        // Connect both clients
        console.log('📡 Connecting clients...');
        await dan.connect();
        await netstorm.connect();
        
        // Wait a moment for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Login both users
        console.log('\n🔐 Logging in users...');
        dan.login();
        netstorm.login();
        
        // Wait for login to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Dan adds NetStorm as buddy
        console.log('\n👥 Testing buddy addition...');
        dan.addBuddy(2); // NetStorm's UID should be 2
        
        // Wait for buddy status to be sent
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // NetStorm goes away
        console.log('\n🌙 Testing away mode...');
        netstorm.setAwayMode();
        
        // Wait for status change
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // NetStorm comes back online
        console.log('\n☀️ Testing online mode...');
        netstorm.setOnlineMode();
        
        // Wait for status change
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // NetStorm disconnects (should show offline status)
        console.log('\n📴 Testing disconnect (offline status)...');
        netstorm.disconnect();
        
        // Wait for disconnect to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n✅ Test completed! Check the logs above for buddy status updates.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        // Clean up
        dan.disconnect();
        netstorm.disconnect();
    }
}

// Run the test
if (require.main === module) {
    testBuddyStatusSystem().then(() => {
        console.log('\n🎉 Buddy status test finished!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test error:', error);
        process.exit(1);
    });
}

module.exports = { PaltalkTestClient, testBuddyStatusSystem };
