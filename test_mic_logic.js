#!/usr/bin/env node

// Test the automatic mic permissions logic
const Group = require('./Models/Group.js');

console.log('🧪 Testing Automatic Mic Permissions Logic');
console.log('='.repeat(50));

// Test Case 1: Room with mike=1 (automatic mic enabled), voice room
console.log('\n📋 Test Case 1: Voice room with automatic mic (mike=1)');
const room1 = new Group({
    id: 50001,
    nm: 'Test Voice Room - Auto Mic',
    v: 1,    // voice room
    mike: 1, // automatic mic enabled
    r: 'G'
});

const user1 = {
    uid: 1000001,
    nickname: 'TestUser1',
    admin: 0
};

room1.addUser(user1, true, false); // visible=true, isAdmin=false
console.log(`   User mic permission: ${user1.mic} (expected: 1)`);
console.log(`   ✅ Test ${user1.mic === 1 ? 'PASSED' : 'FAILED'}`);

// Test Case 2: Room with mike=0 (manual mic only), voice room
console.log('\n📋 Test Case 2: Voice room with manual mic only (mike=0)');
const room2 = new Group({
    id: 50010,
    nm: 'Test Voice Room - Manual Mic',
    v: 1,    // voice room
    mike: 0, // manual mic only
    r: 'G'
});

const user2 = {
    uid: 1000002,
    nickname: 'TestUser2',
    admin: 0
};

room2.addUser(user2, true, false); // visible=true, isAdmin=false
console.log(`   User mic permission: ${user2.mic} (expected: 0)`);
console.log(`   ✅ Test ${user2.mic === 0 ? 'PASSED' : 'FAILED'}`);

// Test Case 3: Admin user in voice room (should always get mic)
console.log('\n📋 Test Case 3: Admin user in voice room (should always get mic)');
const room3 = new Group({
    id: 50011,
    nm: 'Test Voice Room - Admin Test',
    v: 1,    // voice room
    mike: 0, // manual mic only
    r: 'G'
});

const user3 = {
    uid: 1000003,
    nickname: 'AdminUser',
    admin: 1
};

room3.addUser(user3, true, true); // visible=true, isAdmin=true
console.log(`   Admin user mic permission: ${user3.mic} (expected: 1)`);
console.log(`   ✅ Test ${user3.mic === 1 ? 'PASSED' : 'FAILED'}`);

// Test Case 4: Text room (no voice features)
console.log('\n📋 Test Case 4: Text room (v=0, no voice features)');
const room4 = new Group({
    id: 50012,
    nm: 'Test Text Room',
    v: 0,    // text room (no voice)
    mike: 1, // irrelevant for text rooms
    r: 'G'
});

const user4 = {
    uid: 1000004,
    nickname: 'TextUser',
    admin: 0
};

room4.addUser(user4, true, false); // visible=true, isAdmin=false
console.log(`   Text room user mic permission: ${user4.mic} (expected: 0)`);
console.log(`   ✅ Test ${user4.mic === 0 ? 'PASSED' : 'FAILED'}`);

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));

const testResults = [
    { name: 'Voice room with auto mic', passed: user1.mic === 1 },
    { name: 'Voice room with manual mic', passed: user2.mic === 0 },
    { name: 'Admin in voice room', passed: user3.mic === 1 },
    { name: 'Text room user', passed: user4.mic === 0 }
];

const passedTests = testResults.filter(t => t.passed).length;
const totalTests = testResults.length;

console.log(`Tests passed: ${passedTests}/${totalTests}`);

testResults.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} ${test.name}`);
});

if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Automatic mic permissions logic is working correctly.');
} else {
    console.log('\n❌ Some tests failed. Check the Group.js implementation.');
}

console.log('\n📝 Implementation Details:');
console.log('• Users get mic=1 automatically when room.mike=1 AND room.v=1 (voice room)');
console.log('• Admins always get mic=1 in voice rooms regardless of room.mike setting');
console.log('• Users in text rooms (v=0) never get mic permissions');
console.log('• When room.mike=0, users must manually request mic permissions');
