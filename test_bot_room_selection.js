#!/usr/bin/env node

/**
 * Test Bot Room Selection - Demonstrates new bot room targeting capabilities
 */

const net = require('net');
const { BOT_CONFIG } = require('./src/config/constants');

const SERVER_HOST = '192.168.1.16';
const SERVER_PORT = 3000; // Web API port
const CHAT_PORT = 5001;

console.log('🤖 Testing Bot Room Selection System\n');

// Test scenarios
const testScenarios = [
    {
        name: "Single Room (All bots in one room)",
        config: {
            botCount: 5,
            targetRoomId: "first", // Use first available room
            distributionMode: "single_room"
        }
    },
    {
        name: "Random Distribution",
        config: {
            botCount: 8,
            distributionMode: "random"
        }
    },
    {
        name: "Balanced Distribution",
        config: {
            botCount: 10,
            distributionMode: "balanced"
        }
    }
];

async function testBotRoomSelection() {
    console.log('🔍 Starting Bot Room Selection Tests...\n');

    try {
        // First, get available rooms
        const availableRooms = await getAvailableRooms();
        console.log(`📋 Available Rooms (${availableRooms.length} total):`);
        availableRooms.forEach(room => {
            console.log(`   - ${room.name} (ID: ${room.id}, Users: ${room.userCount})`);
        });
        console.log();

        // Run each test scenario
        for (let i = 0; i < testScenarios.length; i++) {
            const scenario = testScenarios[i];
            console.log(`\n🧪 Test ${i + 1}: ${scenario.name}`);
            console.log('─'.repeat(50));
            
            // If targeting first room, update config with actual room ID
            if (scenario.config.targetRoomId === "first" && availableRooms.length > 0) {
                scenario.config.targetRoomId = availableRooms[0].id;
            }
            
            await runBotTest(scenario);
            
            if (i < testScenarios.length - 1) {
                console.log('\n⏳ Waiting 5 seconds before next test...');
                await sleep(5000);
            }
        }

        console.log('\n✅ All bot room selection tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function getAvailableRooms() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({});
        
        const options = {
            hostname: SERVER_HOST,
            port: SERVER_PORT,
            path: '/api/rooms/available',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = require('http').request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(responseData);
                    if (response.success) {
                        resolve(response.data.rooms);
                    } else {
                        reject(new Error('Failed to get rooms: ' + responseData));
                    }
                } catch (error) {
                    reject(new Error('Invalid response: ' + responseData));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

async function runBotTest(scenario) {
    try {
        console.log('📤 Starting bots with config:', JSON.stringify(scenario.config, null, 2));
        
        // Start bots
        const startResult = await sendBotCommand('/api/bots/start', scenario.config);
        console.log('🚀 Bots started:', startResult.message);
        
        // Wait a moment for bots to settle
        await sleep(2000);
        
        // Get bot statistics
        const stats = await getBotStats();
        console.log('📊 Bot Distribution:');
        console.log(`   Total Bots: ${stats.totalBots}`);
        console.log(`   Distribution Mode: ${stats.config?.distributionMode || 'N/A'}`);
        console.log('   Room Distribution:');
        
        Object.entries(stats.roomDistribution).forEach(([roomName, count]) => {
            console.log(`     - ${roomName}: ${count} bots`);
        });
        
        // Show detailed bot info if all in one room
        if (scenario.config.distributionMode === 'single_room' || scenario.config.targetRoomId) {
            console.log('\n🔍 Bot Details:');
            stats.botDetails.slice(0, 5).forEach(bot => {
                console.log(`     - ${bot.nickname} in ${bot.roomName} (${bot.chatPersonality})`);
            });
            if (stats.botDetails.length > 5) {
                console.log(`     ... and ${stats.botDetails.length - 5} more bots`);
            }
        }
        
        // Stop bots
        await sleep(1000);
        const stopResult = await sendBotCommand('/api/bots/stop', {});
        console.log('🛑 Bots stopped:', stopResult.message);
        
    } catch (error) {
        console.error('❌ Test scenario failed:', error.message);
        // Try to stop bots in case they're still running
        try {
            await sendBotCommand('/api/bots/stop', {});
        } catch (stopError) {
            // Ignore stop errors
        }
    }
}

async function sendBotCommand(endpoint, config) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(config);
        
        const options = {
            hostname: SERVER_HOST,
            port: SERVER_PORT,
            path: endpoint,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = require('http').request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(responseData);
                    if (response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response.error || 'Command failed: ' + responseData));
                    }
                } catch (error) {
                    reject(new Error('Invalid response: ' + responseData));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

async function getBotStats() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SERVER_HOST,
            port: SERVER_PORT,
            path: '/api/bots/stats',
            method: 'GET'
        };

        const req = require('http').request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(responseData);
                    if (response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error('Failed to get stats: ' + responseData));
                    }
                } catch (error) {
                    reject(new Error('Invalid response: ' + responseData));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServerConnection() {
    return new Promise((resolve) => {
        const socket = net.createConnection(CHAT_PORT, SERVER_HOST);
        
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        
        socket.on('error', () => {
            resolve(false);
        });
        
        setTimeout(() => {
            socket.destroy();
            resolve(false);
        }, 3000);
    });
}

// Main execution
async function main() {
    console.log('🔍 Checking server connection...');
    
    const serverOnline = await checkServerConnection();
    if (!serverOnline) {
        console.error(`❌ Cannot connect to Paltalk server at ${SERVER_HOST}:${CHAT_PORT}`);
        console.log('💡 Please make sure the server is running and accessible.');
        process.exit(1);
    }
    
    console.log('✅ Server connection confirmed\n');
    await testBotRoomSelection();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping test and cleaning up...');
    try {
        await sendBotCommand('/api/bots/stop', {});
        console.log('✅ Cleanup completed');
    } catch (error) {
        // Ignore cleanup errors
    }
    process.exit(0);
});

main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});
