const net = require('net');const { PACKET_TYPES } = require('./PacketHeaders');// Test configurationconst SERVER_HOST = 'localhost';const SERVER_PORT = 5001;// Test roomsconst TEST_ROOMS = [    { id: 50001, name: 'Royal Oak', mike: 1, v: 1, expected_mic: 1 }, // Auto mic enabled    { id: 50010, name: 'Test Room - No Auto Mic', mike: 0, v: 1, expected_mic: 0 }, // Manual mic only];class MicPermissionTester {    constructor() {        this.results = [];    }    async runTests() {        console.log('🧪 Starting Automatic Mic Permissions Test');        console.log('='.repeat(50));        for (const room of TEST_ROOMS) {            console.log(`\n📋 Testing Room: ${room.name} (ID: ${room.id})`);            console.log(`   Settings: mike=${room.mike}, voice=${room.v}`);            console.log(`   Expected mic permission: ${room.expected_mic}`);                        try {                const result = await this.testRoomJoin(room);                this.results.push(result);                                if (result.success) {                    console.log(`   ✅ Test PASSED: User mic = ${result.userMic}`);                } else {                    console.log(`   ❌ Test FAILED: Expected mic=${room.expected_mic}, got mic=${result.userMic}`);                }            } catch (error) {                console.log(`   ❌ Test ERROR: ${error.message}`);                this.results.push({ room: room.name, success: false, error: error.message });            }                        // Wait between tests            await this.sleep(1000);        }        this.printSummary();    }    async testRoomJoin(room) {        return new Promise((resolve, reject) => {            const client = new net.Socket();            let receivedUserList = false;            let userMic = null;            const timeout = setTimeout(() => {                client.destroy();                reject(new Error('Test timeout'));            }, 10000);            client.connect(SERVER_PORT, SERVER_HOST, () => {                console.log(`   🔌 Connected to server`);                                // Send login packet first                this.sendLoginPacket(client);                                // Wait a bit then join room                setTimeout(() => {                    this.sendRoomJoinPacket(client, room.id);                }, 500);            });            client.on('data', (data) => {                try {                    const packetType = data.readInt16BE(2);                    console.log(`   📦 Received packet type: ${packetType}`);                                        // Look for user list packet (0x0154)                    if (packetType === 0x0154 && !receivedUserList) {                        receivedUserList = true;                        const userListData = data.slice(6).toString('utf8');                        console.log(`   👥 User list received: ${userListData.substring(0, 100)}...`);                                                // Parse mic permission from user list                        const micMatch = userListData.match(/mic=(\d+)/);                        if (micMatch) {                            userMic = parseInt(micMatch[1]);                            console.log(`   🎤 Parsed user mic permission: ${userMic}`);                                                        clearTimeout(timeout);                            client.destroy();                                                        const success = userMic === room.expected_mic;                            resolve({                                room: room.name,                                roomId: room.id,                                success: success,                                userMic: userMic,                                expectedMic: room.expected_mic                            });                        }                    }                                        // Look for automatic mic packet (-932)                    if (packetType === PACKET_TYPES.PACKET_ROOM_NEW_USER_MIC) {                        console.log(`   🎤 Received PACKET_ROOM_NEW_USER_MIC - automatic mic granted!`);                    }                                    } catch (error) {                    console.log(`   ⚠️  Error parsing packet: ${error.message}`);                }            });            client.on('error', (error) => {                clearTimeout(timeout);                reject(error);            });            client.on('close', () => {                console.log(`   🔌 Connection closed`);                if (!receivedUserList) {                    clearTimeout(timeout);                    reject(new Error('Connection closed before receiving user list'));                }            });        });    }    sendLoginPacket(client) {
        // Simple login packet simulation
        const loginData = Buffer.from('NetStorm\x00default_password_hash', 'utf8');
        const packet = Buffer.alloc(6 + loginData.length);
        packet.writeUInt32BE(loginData.length + 2, 0);
        packet.writeInt16BE(PACKET_TYPES.LOGIN, 4);
        loginData.copy(packet, 6);
        client.write(packet);
        console.log(`   📤 Sent login packet`);
    }

    sendRoomJoinPacket(client, roomId) {
        // Room join packet
        const roomIdBuffer = Buffer.alloc(4);
        roomIdBuffer.writeUInt32BE(roomId, 0);
        
        const packet = Buffer.alloc(10);
        packet.writeUInt32BE(6, 0); // packet length
        packet.writeInt16BE(PACKET_TYPES.ROOM_JOIN, 4);
        roomIdBuffer.copy(packet, 6);
        
        client.write(packet);
        console.log(`   📤 Sent room join packet for room ${roomId}`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(50));
        
        const passed = this.results.filter(r => r.success).length;
        const total = this.results.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${total - passed}`);
        
        if (passed === total) {
            console.log('\n🎉 ALL TESTS PASSED! Automatic mic permissions working correctly.');
        } else {
            console.log('\n❌ Some tests failed. Check implementation.');
        }
        
        // Detailed results
        console.log('\nDetailed Results:');
        this.results.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.room}: mic=${result.userMic} (expected: ${result.expectedMic})`);
        });
    }
}

// Run the tests
async function main() {
    const tester = new MicPermissionTester();
    await tester.runTests();
    process.exit(0);
}

main().catch(console.error);
