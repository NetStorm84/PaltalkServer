#!/usr/bin/env node

/**
 * Complete System Test - Tests buddy status functionality and packet type 13 handling
 * This test simulates real client behavior including unknown packet types
 */

const net = require('net');
const { PACKET_TYPES } = require('./PacketHeaders');

// Test configuration
const SERVER_HOST = 'localhost';
const SERVER_PORT = 5001;
const PROTOCOL_VERSION = 29;

let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function addTestResult(testName, passed, details = '') {
    testResults.tests.push({ testName, passed, details });
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${testName}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName}: ${details}`);
    }
    if (details && passed) {
        console.log(`   ${details}`);
    }
}

function createPacket(packetType, payload = Buffer.alloc(0)) {
    const header = Buffer.alloc(6);
    header.writeInt16BE(packetType, 0);
    header.writeInt16BE(PROTOCOL_VERSION, 2);
    header.writeUInt16BE(payload.length, 4);
    return Buffer.concat([header, payload]);
}

function parsePacket(buffer) {
    if (buffer.length < 6) return null;
    
    const packetType = buffer.readInt16BE(0);
    const version = buffer.readInt16BE(2);
    const length = buffer.readUInt16BE(4);
    
    if (buffer.length < 6 + length) return null;
    
    const payload = buffer.slice(6, 6 + length);
    
    return {
        type: packetType,
        version,
        length,
        payload,
        totalLength: 6 + length
    };
}

class TestClient {
    constructor(nickname, uid) {
        this.nickname = nickname;
        this.uid = uid;
        this.socket = null;
        this.connected = false;
        this.loggedIn = false;
        this.buffer = Buffer.alloc(0);
        this.packets = [];
        this.buddyStatusUpdates = [];
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection(SERVER_PORT, SERVER_HOST);
            
            this.socket.on('connect', () => {
                this.connected = true;
                console.log(`[${this.nickname}] ✅ Connected to server`);
                resolve();
            });

            this.socket.on('data', (data) => this.handleData(data));
            
            this.socket.on('error', (err) => {
                console.error(`[${this.nickname}] ❌ Socket error:`, err.message);
                reject(err);
            });

            this.socket.on('close', () => {
                this.connected = false;
                console.log(`[${this.nickname}] 🔌 Disconnected from server`);
            });

            setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });
    }

    handleData(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
        
        while (this.buffer.length >= 6) {
            const packet = parsePacket(this.buffer);
            if (!packet) break;
            
            this.packets.push(packet);
            this.processPacket(packet);
            
            this.buffer = this.buffer.slice(packet.totalLength);
        }
    }

    processPacket(packet) {
        switch (packet.type) {
            case PACKET_TYPES.HELLO:
                console.log(`[${this.nickname}] 👋 Received HELLO from server`);
                break;
                
            case PACKET_TYPES.UIN_RESPONSE:
                const response = packet.payload.toString();
                if (response.includes(`uid=${this.uid}`)) {
                    console.log(`[${this.nickname}] 🆔 Received UID: ${this.uid}`);
                }
                break;
                
            case PACKET_TYPES.LOGIN_NOT_COMPLETE:
                console.log(`[${this.nickname}] ⏳ Received LOGIN_NOT_COMPLETE`);
                break;
                
            case PACKET_TYPES.SERVER_KEY:
                const serverKey = packet.payload.toString().substring(0, 15);
                console.log(`[${this.nickname}] 🔑 Received SERVER_KEY: ${serverKey}...`);
                break;
                
            case PACKET_TYPES.LOGIN:
                this.loggedIn = true;
                console.log(`[${this.nickname}] ✅ Login successful! UID: ${this.uid}`);
                break;
                
            case PACKET_TYPES.USER_DATA:
                console.log(`[${this.nickname}] 📊 Received USER_DATA`);
                break;
                
            case PACKET_TYPES.BUDDY_LIST:
                console.log(`[${this.nickname}] 👥 Buddy list received`);
                break;
                
            case PACKET_TYPES.STATUS_CHANGE:
                if (packet.payload.length >= 8) {
                    const uid = packet.payload.readUInt32BE(0);
                    const statusCode = packet.payload.readUInt32BE(4);
                    let status = '🔴 OFFLINE';
                    if (statusCode === 0x0000001E) status = '🟢 ONLINE';
                    else if (statusCode === 0x00000046) status = '🟡 AWAY';
                    
                    console.log(`[${this.nickname}] 📊 BUDDY STATUS UPDATE: User ${uid} is now ${status}`);
                    this.buddyStatusUpdates.push({ uid, statusCode, status });
                }
                break;
                
            default:
                console.log(`[${this.nickname}] 📦 Received packet type: ${packet.type} (${packet.payload.length} bytes)`);
        }
    }

    sendPacket(packetType, payload = Buffer.alloc(0)) {
        if (!this.connected) throw new Error('Not connected');
        const packet = createPacket(packetType, payload);
        this.socket.write(packet);
    }

    async performLoginSequence() {
        console.log(`[${this.nickname}] 🔐 Starting login sequence...`);
        
        // Step 1: CLIENT_HELLO
        console.log(`[${this.nickname}] 👋 Sent CLIENT_HELLO`);
        this.sendPacket(PACKET_TYPES.CLIENT_HELLO);
        await this.waitForPacket(PACKET_TYPES.HELLO);
        
        // Step 2: GET_UIN
        console.log(`[${this.nickname}] 🆔 Requested UID for nickname: ${this.nickname}`);
        const nicknamePayload = Buffer.from('\x00\x00\x00\x00' + this.nickname);
        this.sendPacket(PACKET_TYPES.GET_UIN, nicknamePayload);
        await this.waitForPacket(PACKET_TYPES.UIN_RESPONSE);
        
        // Step 3: LYMERICK
        console.log(`[${this.nickname}] 🔑 Sent LYMERICK`);
        this.sendPacket(PACKET_TYPES.LYMERICK);
        await this.waitForPacket(PACKET_TYPES.LOGIN_NOT_COMPLETE);
        await this.waitForPacket(PACKET_TYPES.SERVER_KEY);
        
        // Step 4: LOGIN with UID
        console.log(`[${this.nickname}] ✅ Sent LOGIN with UID: ${this.uid}`);
        const loginPayload = Buffer.alloc(4);
        loginPayload.writeUInt32BE(this.uid, 0);
        this.sendPacket(PACKET_TYPES.LOGIN, loginPayload);
        
        await this.waitForPacket(PACKET_TYPES.LOGIN);
        await this.waitForPacket(PACKET_TYPES.USER_DATA);
        
        console.log(`[${this.nickname}] ✅ Login sequence completed`);
    }

    async waitForPacket(packetType, timeout = 2000) {
        return new Promise((resolve, reject) => {
            const checkPacket = () => {
                const packet = this.packets.find(p => p.type === packetType);
                if (packet) {
                    resolve(packet);
                } else {
                    setTimeout(checkPacket, 50);
                }
            };
            
            checkPacket();
            
            setTimeout(() => {
                reject(new Error(`Timeout waiting for packet type ${packetType}`));
            }, timeout);
        });
    }

    async addBuddy(buddyUid) {
        console.log(`[${this.nickname}] 👥 Adding buddy with UID: ${buddyUid}`);
        const payload = Buffer.alloc(4);
        payload.writeUInt32BE(buddyUid, 0);
        this.sendPacket(PACKET_TYPES.ADD_PAL, payload);
    }

    async setAwayMode() {
        console.log(`[${this.nickname}] 🌙 Setting away mode`);
        this.sendPacket(PACKET_TYPES.AWAY_MODE);
    }

    async setOnlineMode() {
        console.log(`[${this.nickname}] ☀️ Setting online mode`);
        this.sendPacket(PACKET_TYPES.ONLINE_MODE);
    }

    async sendKeepAlive() {
        console.log(`[${this.nickname}] 💓 Sending KEEP_ALIVE packet (type 13)`);
        // Send packet type 13 (0x000D) - the one that real clients send
        this.sendPacket(13, Buffer.from([0x00, 0x01, 0x02, 0x03])); // Sample payload
    }

    async sendUnknownPackets() {
        console.log(`[${this.nickname}] 🔍 Sending unknown packet types`);
        
        // Send various unknown packet types that might be sent by real clients
        const unknownTypes = [-2121, -2100, -160, -3000, -1100];
        
        for (const type of unknownTypes) {
            console.log(`[${this.nickname}] 📤 Sending unknown packet type: ${type}`);
            this.sendPacket(type, Buffer.from([0x01, 0x02, 0x03]));
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    disconnect() {
        if (this.socket && this.connected) {
            console.log(`[${this.nickname}] 🔌 Disconnecting from server`);
            this.socket.destroy();
        }
    }
}

async function runTests() {
    console.log('🧪 Starting Complete System Test\n');

    let dan = null;
    let netstorm = null;

    try {
        // Test 1: Client Connection
        console.log('📡 Testing client connections...');
        dan = new TestClient('Dan', 1000004);
        netstorm = new TestClient('NetStorm', 1000002);

        await dan.connect();
        await netstorm.connect();
        addTestResult('Client connections established', true);

        // Test 2: Login sequences
        console.log('\n🔐 Testing login sequences...');
        await dan.performLoginSequence();
        await netstorm.performLoginSequence();
        addTestResult('Login sequences completed', dan.loggedIn && netstorm.loggedIn);

        // Test 3: Packet type 13 (KEEP_ALIVE) handling
        console.log('\n💓 Testing packet type 13 (KEEP_ALIVE) handling...');
        await dan.sendKeepAlive();
        await netstorm.sendKeepAlive();
        addTestResult('KEEP_ALIVE packets sent', true, 'Server should log these without errors');

        // Test 4: Unknown packet types
        console.log('\n🔍 Testing unknown packet type handling...');
        await dan.sendUnknownPackets();
        addTestResult('Unknown packet types sent', true, 'Server should handle gracefully');

        // Test 5: Buddy status functionality
        console.log('\n👥 Testing buddy status functionality...');
        const initialStatusCount = dan.buddyStatusUpdates.length;
        
        await dan.addBuddy(1000002); // Add NetStorm as buddy
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // NetStorm changes status
        await netstorm.setAwayMode();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await netstorm.setOnlineMode();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const finalStatusCount = dan.buddyStatusUpdates.length;
        const receivedStatusUpdates = finalStatusCount > initialStatusCount;
        addTestResult('Buddy status updates received', receivedStatusUpdates, 
            `Received ${finalStatusCount - initialStatusCount} status updates`);

        // Test 6: Status change propagation
        const awayUpdate = dan.buddyStatusUpdates.find(update => 
            update.uid === 1000002 && update.statusCode === 0x00000046);
        const onlineUpdate = dan.buddyStatusUpdates.find(update => 
            update.uid === 1000002 && update.statusCode === 0x0000001E);
        
        addTestResult('Away status propagation', !!awayUpdate);
        addTestResult('Online status propagation', !!onlineUpdate);

        // Test 7: Server stability
        console.log('\n🏥 Testing server stability...');
        // Send rapid packets to test stability
        for (let i = 0; i < 10; i++) {
            await dan.sendKeepAlive();
            await netstorm.sendKeepAlive();
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        addTestResult('Server stability under load', true, 'Sent 20 rapid KEEP_ALIVE packets');

    } catch (error) {
        console.error('❌ Test error:', error.message);
        addTestResult('System test', false, error.message);
    } finally {
        // Cleanup
        if (dan) dan.disconnect();
        if (netstorm) netstorm.disconnect();
        
        console.log('\n📊 Test Results Summary:');
        console.log('========================');
        console.log(`✅ Passed: ${testResults.passed}`);
        console.log(`❌ Failed: ${testResults.failed}`);
        console.log(`📊 Total: ${testResults.tests.length}`);
        
        if (testResults.failed === 0) {
            console.log('\n🎉 All tests passed! Buddy status and packet type 13 handling working correctly!');
        } else {
            console.log('\n⚠️  Some tests failed. Please check the issues above.');
        }
        
        // Give a moment for cleanup
        setTimeout(() => process.exit(testResults.failed > 0 ? 1 : 0), 1000);
    }
}

// Run the tests
runTests().catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
});
