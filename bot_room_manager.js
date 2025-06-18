#!/usr/bin/env node

/**
 * Bot Room Manager - Command-line utility for managing bot room assignments
 */

const { BOT_CONFIG } = require('./src/config/constants');

const SERVER_HOST = '192.168.1.16';
const SERVER_PORT = 3000;

// Command line argument parsing
const args = process.argv.slice(2);

function showUsage() {
    console.log(`
🤖 Bot Room Manager

USAGE:
  node bot_room_manager.js <command> [options]

COMMANDS:
  start <mode> [options]     Start bots with specified distribution mode
  stop                       Stop all running bots
  stats                      Show current bot statistics
  rooms                      List available rooms
  help                       Show this help message

DISTRIBUTION MODES:
  single <roomId>           Put all bots in one specific room
  first                     Put all bots in the first available room
  random                    Distribute bots randomly across all rooms
  balanced                  Distribute bots evenly across rooms

OPTIONS:
  --count <number>          Number of bots to create (default: ${BOT_CONFIG.DEFAULT_BOT_COUNT})
  --chat-freq <ms>          Chat frequency in milliseconds (default: ${BOT_CONFIG.DEFAULT_CHAT_FREQUENCY_MS})
  --move-freq <ms>          Move frequency in milliseconds (default: ${BOT_CONFIG.DEFAULT_MOVE_FREQUENCY_MS})

EXAMPLES:
  node bot_room_manager.js start single 1001 --count 10
  node bot_room_manager.js start first --count 5 --chat-freq 15000
  node bot_room_manager.js start random --count 15
  node bot_room_manager.js start balanced --count 20
  node bot_room_manager.js stats
  node bot_room_manager.js rooms
`);
}

async function executeCommand() {
    if (args.length === 0 || args[0] === 'help') {
        showUsage();
        return;
    }

    const command = args[0];

    try {
        switch (command) {
            case 'start':
                await handleStartCommand();
                break;
            case 'stop':
                await handleStopCommand();
                break;
            case 'stats':
                await handleStatsCommand();
                break;
            case 'rooms':
                await handleRoomsCommand();
                break;
            default:
                console.error(`❌ Unknown command: ${command}`);
                showUsage();
                process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

async function handleStartCommand() {
    if (args.length < 2) {
        console.error('❌ Distribution mode required for start command');
        showUsage();
        process.exit(1);
    }

    const mode = args[1];
    const options = parseOptions(args.slice(2));

    let config = {
        botCount: options.count || BOT_CONFIG.DEFAULT_BOT_COUNT,
        chatFrequencyMs: options['chat-freq'] || BOT_CONFIG.DEFAULT_CHAT_FREQUENCY_MS,
        moveFrequencyMs: options['move-freq'] || BOT_CONFIG.DEFAULT_MOVE_FREQUENCY_MS
    };

    switch (mode) {
        case 'single':
            if (args.length < 3) {
                console.error('❌ Room ID required for single mode');
                process.exit(1);
            }
            config.targetRoomId = parseInt(args[2]);
            config.distributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM;
            break;

        case 'first':
            config.targetRoomId = "first";
            config.distributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM;
            break;

        case 'random':
            config.distributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.RANDOM;
            break;

        case 'balanced':
            config.distributionMode = BOT_CONFIG.ROOM_DISTRIBUTION_MODES.BALANCED;
            break;

        default:
            console.error(`❌ Unknown distribution mode: ${mode}`);
            showUsage();
            process.exit(1);
    }

    console.log('🚀 Starting bots with configuration:');
    console.log(JSON.stringify(config, null, 2));
    console.log();

    const result = await sendRequest('/api/bots/start', 'POST', config);
    console.log(`✅ ${result.message}`);
    console.log(`📊 Active bots: ${result.activeBots || result.botCount}`);

    if (config.distributionMode === BOT_CONFIG.ROOM_DISTRIBUTION_MODES.SINGLE_ROOM) {
        console.log('💡 All bots will stay in the same room (no automatic movement)');
    }
}

async function handleStopCommand() {
    console.log('🛑 Stopping all bots...');
    const result = await sendRequest('/api/bots/stop', 'POST', {});
    console.log(`✅ ${result.message}`);
}

async function handleStatsCommand() {
    console.log('📊 Getting bot statistics...\n');
    const stats = await sendRequest('/api/bots/stats', 'GET');
    
    console.log(`Total Bots: ${stats.totalBots}`);
    console.log(`Running: ${stats.isRunning ? 'Yes' : 'No'}`);
    
    if (stats.config) {
        console.log(`Distribution Mode: ${stats.config.distributionMode}`);
        console.log(`Chat Frequency: ${stats.config.chatFrequencyMs}ms`);
        console.log(`Move Frequency: ${stats.config.moveFrequencyMs}ms`);
    }
    
    console.log('\nRoom Distribution:');
    if (Object.keys(stats.roomDistribution).length === 0) {
        console.log('  No bots currently active');
    } else {
        Object.entries(stats.roomDistribution).forEach(([roomName, count]) => {
            console.log(`  - ${roomName}: ${count} bots`);
        });
    }

    if (stats.botDetails && stats.botDetails.length > 0) {
        console.log('\nBot Details (first 10):');
        stats.botDetails.slice(0, 10).forEach(bot => {
            console.log(`  - ${bot.nickname} in ${bot.roomName} (${bot.chatPersonality})`);
        });
        
        if (stats.botDetails.length > 10) {
            console.log(`  ... and ${stats.botDetails.length - 10} more bots`);
        }
    }
}

async function handleRoomsCommand() {
    console.log('📋 Getting available rooms...\n');
    const data = await sendRequest('/api/rooms/available', 'GET');
    
    console.log(`Total Available Rooms: ${data.total}\n`);
    
    if (data.rooms.length === 0) {
        console.log('No rooms available');
        return;
    }

    console.log('Available Rooms:');
    data.rooms.forEach(room => {
        const type = room.isVoice ? 'Voice' : 'Text';
        console.log(`  - ${room.name} (ID: ${room.id}, Users: ${room.userCount}, Type: ${type})`);
        if (room.topic) {
            console.log(`    Topic: ${room.topic}`);
        }
    });
}

function parseOptions(args) {
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] && args[i].startsWith('--')) {
            const key = args[i].substring(2);
            const value = args[i + 1];
            
            if (value && !value.startsWith('--')) {
                options[key] = isNaN(value) ? value : parseInt(value);
                i++; // Skip the value in next iteration
            }
        }
    }
    
    return options;
}

async function sendRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SERVER_HOST,
            port: SERVER_PORT,
            path: endpoint,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            const jsonData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }

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
                        reject(new Error(response.error || 'Request failed'));
                    }
                } catch (error) {
                    reject(new Error('Invalid response from server'));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Connection failed: ${error.message}`));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Execute the command
executeCommand().catch(error => {
    console.error(`💥 Unexpected error: ${error.message}`);
    process.exit(1);
});
