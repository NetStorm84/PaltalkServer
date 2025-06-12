
const AWAY_MODE = 0x46;
const ONLINE_MODE = 0x1e;
const OFFLINE_MODE = 0x00;

function hexToDec(hex) {
    return parseInt(hex.toString('hex'), 16);
}

function decToHex(decimal) {
    return parseInt(decimal).toString(16).padStart(8, '0');
}

function hexToAscii(hex){
    return hex.toString('ascii').replace(/[^\x20-\x7E]/g, '.');
}

function asciiToHex(str) {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16);
    }
    return hex;
}

const modes = {
    AWAY_MODE,
    ONLINE_MODE,
    OFFLINE_MODE
};

const conversions = {
    hexToDec,
    decToHex,
    asciiToHex
};

module.exports = { 
    conversions,
    modes
};