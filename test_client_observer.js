/**
 * Simple test client to connect to a room and observe user list changes
 */
const net = require('net');

const SERVER_HOST = '192.168.1.16';
const SERVER_PORT = 5001;
const TEST_ROOM_ID = 50001; // The Royal Oak

class TestClient {
    constructor() {
        this.socket = null;
        this.buffer = Buffer.alloc(0);
        this.isLoggedIn = false;
        this.isInRoom = false;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection(SERVER_PORT, SERVER_HOST);
            
            this.socket.on('connect', () => {
                console.log('✅ Connected to server');
                this.setupDataHandler();
                resolve();
            });
            
            this.socket.on('error', reject);
            this.socket.on('close', () => {
                console.log('🔌 Disconnected from server');
            });
        });
    }

    setupDataHandler() {
        this.socket.on('data', (data) => {
            this.buffer = Buffer.concat([this.buffer, data]);
            this.processPackets();
        });
    }

    processPackets() {
        while (this.buffer.length >= 6) {
            const packetLength = this.buffer.readUInt16LE(0);
            
            if (this.buffer.length < packetLength) {
                break;
            }
            
            const packetType = this.buffer.readUInt16LE(2);
            const payload = this.buffer.slice(6, packetLength);
            this.buffer = this.buffer.slice(packetLength);
            
            this.handlePacket(packetType, payload);
        }
    }

    handlePacket(packetType, payload) {
        const hexType = `0x${packetType.toString(16).padStart(4, '0')}`;
        
        switch (packetType) {
            case 0x0154: // User list
                this.handleUserList(payload);
                break;
            case 0x0136: // Room join response
                console.log(`🚪 Joined room successfully`);
                this.isInRoom = true;
                break;
            case 0x015e: // Room message
                const message = payload.toString('utf8');
                if (!message.includes('Welcome to the room')) {
                    console.log(`💬 Message: ${message}`);
                }
                break;
            case 0x0043: // Login response
                console.log('🔐 Login successful');
                this.isLoggedIn = true;
                break;
            default:
                console.log(`📦 Packet ${hexType}, length: ${payload.length}`);
                break;
        }
    }

    handleUserList(payload) {
        try {
            const userListStr = payload.toString('utf8');
            const users = [];
            const entries = userListStr.split('È'); // 0xC8 delimiter
            
            for (const entry of entries) {
                if (entry.trim() && !entry.includes('eof=1')) {
                    const user = this.parseUserEntry(entry);
                    if (user) {
                        users.push(user);
                    }
                }
            }
            
            console.log(`\n📋 USER LIST UPDATE - ${users.length} users:`);
            users.forEach(user => {
                const isBot = user.uid >= 2000000;
                const botTag = isBot ? ' [BOT]' : '';
                const colorTag = user.color !== '000000000' ? ` (color: ${user.color})` : '';
                console.log(`   👤 ${user.nickname} (UID: ${user.uid})${botTag}${colorTag}`);
            });
            console.log('');
            
        } catch (error) {
            console.error('❌ Error parsing user list:', error);
        }
    }

    parseUserEntry(entry) {
        try {
            const pairs = entry.split('\n');
            const user = {};
            
            for (const pair of pairs) {
                const [key, value] = pair.split('=');
                if (key && value !== undefined) {
                    user[key.trim()] = value.trim();
                }
            }
            
            if (user.uid && user.nickname) {
                return {
                    uid: parseInt(user.uid),
                    nickname: user.nickname,
                    admin: parseInt(user.admin || 0),
                    color: user.color || '000000000',
                    mic: parseInt(user.mic || 0)
                };
            }
        } catch (error) {
            // Ignore parsing errors for malformed entries
        }
        return null;
    }

    async login() {
        const loginData = `TestObserver\ntest@test.com\ntest123\nLinux\n2.0\n`;
        await this.sendPacket(0x0042, Buffer.from(loginData, 'utf8'));
        
        // Wait for login response
        await this.sleep(1000);
    }

    async joinRoom() {
        const roomIdHex = TEST_ROOM_ID.toString(16).padStart(8, '0');
        const joinData = Buffer.from(roomIdHex + '00000000', 'hex');
        await this.sendPacket(0x0065, joinData);
        
        // Wait for room join response
        await this.sleep(1000);
    }

    sendPacket(type, payload) {
        const packet = Buffer.alloc(6 + payload.length);
        packet.writeUInt16LE(packet.length, 0);
        packet.writeUInt16LE(type, 2);
        packet.writeUInt16LE(0, 4);
        payload.copy(packet, 6);
        
        this.socket.write(packet);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async run() {
        try {
            console.log('🔧 Starting test client to observe user list changes...\n');
            
            await this.connect();
            await this.login();
            
            console.log(`🚪 Joining room ${TEST_ROOM_ID}...`);
            await this.joinRoom();
            
            console.log('👀 Watching for user list changes...');
            console.log('💡 Now start/stop bots via the web interface or API to see live updates!\n');
            console.log('🌐 Web Interface: http://localhost:3000/bot-management.html');
            console.log('🛑 Press Ctrl+C to exit\n');
            
            // Keep running
            await new Promise(() => {});
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down test client...');
    process.exit(0);
});

// Run the test client
const client = new TestClient();
client.run();
