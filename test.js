#!/usr/bin/env node

/**
 * Test script for Paltalk Server
 * Tests basic functionality of the overhauled server
 */

const net = require('net');
const http = require('http');

console.log('🧪 Paltalk Server Test Suite');
console.log('============================');

// Configuration
const CHAT_PORT = 5001;
const VOICE_PORT = 2090;
const WEB_PORT = 3000;
const TEST_TIMEOUT = 5000;

let testsRun = 0;
let testsPassed = 0;

function runTest(name, testFn) {
    testsRun++;
    console.log(`\n🔍 Testing: ${name}`);
    
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.log(`❌ Test failed: ${name} (timeout)`);
            resolve(false);
        }, TEST_TIMEOUT);
        
        testFn()
            .then(result => {
                clearTimeout(timeout);
                if (result) {
                    console.log(`✅ Test passed: ${name}`);
                    testsPassed++;
                } else {
                    console.log(`❌ Test failed: ${name}`);
                }
                resolve(result);
            })
            .catch(error => {
                clearTimeout(timeout);
                console.log(`❌ Test failed: ${name} - ${error.message}`);
                resolve(false);
            });
    });
}

// Test chat server connectivity
async function testChatServer() {
    return new Promise((resolve) => {
        const client = new net.Socket();
        
        client.connect(CHAT_PORT, 'localhost', () => {
            console.log('  📡 Chat server is listening');
            client.end();
            resolve(true);
        });
        
        client.on('error', (err) => {
            console.log(`  ❌ Chat server error: ${err.code}`);
            resolve(false);
        });
        
        client.on('close', () => {
            resolve(true);
        });
    });
}

// Test voice server connectivity  
async function testVoiceServer() {
    return new Promise((resolve) => {
        const client = new net.Socket();
        
        client.connect(VOICE_PORT, 'localhost', () => {
            console.log('  🎤 Voice server is listening');
            client.end();
            resolve(true);
        });
        
        client.on('error', (err) => {
            console.log(`  ❌ Voice server error: ${err.code}`);
            resolve(false);
        });
        
        client.on('close', () => {
            resolve(true);
        });
    });
}

// Test web interface
async function testWebInterface() {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${WEB_PORT}`, (res) => {
            if (res.statusCode === 200) {
                console.log('  🌐 Web interface is responding');
                resolve(true);
            } else {
                console.log(`  ❌ Web interface returned status: ${res.statusCode}`);
                resolve(false);
            }
        });
        
        req.on('error', (err) => {
            console.log(`  ❌ Web interface error: ${err.code}`);
            resolve(false);
        });
        
        req.setTimeout(3000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

// Test database file existence
async function testDatabase() {
    const fs = require('fs');
    const path = require('path');
    
    const dbPath = path.join(__dirname, 'database.db');
    if (fs.existsSync(dbPath)) {
        console.log('  🗄️ Database file exists');
        return true;
    } else {
        console.log('  ❌ Database file not found');
        return false;
    }
}

// Test logs directory
async function testLogsDirectory() {
    const fs = require('fs');
    const path = require('path');
    
    const logsPath = path.join(__dirname, 'logs');
    if (fs.existsSync(logsPath)) {
        console.log('  📝 Logs directory exists');
        return true;
    } else {
        console.log('  ❌ Logs directory not found');
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('\nNote: Make sure the server is running (npm start) before running tests\n');
    
    await runTest('Database File', testDatabase);
    await runTest('Logs Directory', testLogsDirectory);
    await runTest('Chat Server Connection', testChatServer);
    await runTest('Voice Server Connection', testVoiceServer);
    await runTest('Web Interface', testWebInterface);
    
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`Total tests: ${testsRun}`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsRun - testsPassed}`);
    
    if (testsPassed === testsRun) {
        console.log('\n🎉 All tests passed! Server is working correctly.');
    } else {
        console.log('\n⚠️ Some tests failed. Check server status and configuration.');
    }
    
    process.exit(testsPassed === testsRun ? 0 : 1);
}

runAllTests().catch(console.error);
