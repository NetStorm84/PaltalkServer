/**
 * Quick test to verify room locking fix
 */
const { Room } = require('./src/models/Room');

// Test room with no password (should show l=0)
const unlockedRoom = new Room({
    id: 1,
    name: "Test Unlocked Room",
    password: "",
    catg: 30018,
    r: 'G',
    v: 1,
    p: 0
}, true);

// Test room with password (should show l=1)
const lockedRoom = new Room({
    id: 2,
    name: "Test Locked Room",
    password: "secret123",
    catg: 30018,
    r: 'G',
    v: 1,
    p: 0
}, true);

console.log("Testing room locking logic:");
console.log("Unlocked room password:", unlockedRoom.password ? "HAS PASSWORD" : "NO PASSWORD");
console.log("Locked room password:", lockedRoom.password ? "HAS PASSWORD" : "NO PASSWORD");

// Test the logic we're using in createRoomListBuffer
const unlockedIsLocked = unlockedRoom.password ? 1 : 0;
const lockedIsLocked = lockedRoom.password ? 1 : 0;

console.log(`Unlocked room l=${unlockedIsLocked} (expected: 0)`);
console.log(`Locked room l=${lockedIsLocked} (expected: 1)`);

// Test room string generation
const unlockedRoomString = `id=${unlockedRoom.id}\nnm=${unlockedRoom.name}\n#=${0}\nv=${unlockedRoom.isVoice}\nl=${unlockedIsLocked}\nr=${unlockedRoom.rating}\np=${unlockedRoom.isPrivate}\nc=000000000`;
const lockedRoomString = `id=${lockedRoom.id}\nnm=${lockedRoom.name}\n#=${0}\nv=${lockedRoom.isVoice}\nl=${lockedIsLocked}\nr=${lockedRoom.rating}\np=${lockedRoom.isPrivate}\nc=000000000`;

console.log("\nRoom list packet strings:");
console.log("Unlocked:", unlockedRoomString);
console.log("Locked:", lockedRoomString);
