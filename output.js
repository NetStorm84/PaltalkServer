
function outputToTerminal(packetType, version, length, payload) {
    
    console.log(`\n--- Packet Details ---`);
    console.log(`Type: ${packetType}`);
    console.log(`Version: ${version}`);
    console.log(`Length: ${length}`);
    console.log(`Payload (Hex): ${payload.toString('hex')}`);
    console.log(`Payload (ASCII): ${payload.toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);

    hexDump(payload);
}

function hexDump(buffer) {
    const length = buffer.length;
    for (let i = 0; i < length; i += 16) {
        const slice = buffer.slice(i, i + 16);
        const hex = slice.toString('hex').match(/.{1,2}/g).join(' ');
        const ascii = slice.toString('ascii').replace(/[^\x20-\x7E]/g, '.');
        console.log(`${(i).toString(16).padStart(8, '0')}  ${hex.padEnd(48, ' ')}  ${ascii}`);
    }
}

module.exports = { outputToTerminal };