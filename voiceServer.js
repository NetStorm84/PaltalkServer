const net = require('net');
const fs = require('fs');
const path = require('path');

// This will store all active socket connections
let sockets = new Set();

const server = net.createServer(socket => {
    console.log('New connection established');
    sockets.add(socket); // Add the new connection to the set
    console.log(`Total active connections: ${sockets.size}`);

    socket.on('data', data => {
        console.log(`Data received: ${data.toString('hex')}`);

        if (data.toString('hex') == '0000c353000f4242' || data.toString('hex') == '0000c353000f4244') {
            socket.write(Buffer.alloc(0));
        }else{
            handleData(socket, data);
            broadcastData(socket, data); // Broadcast the data to all other sockets
        }
    });

    socket.on('connect', () => {
        console.log(`Socket connected from ${socket.remoteAddress}:${socket.remotePort}`);
    });
    
    socket.on('close', hadError => {
        console.log(`Socket closed from ${socket.remoteAddress}:${socket.remotePort}, hadError: ${hadError}`);
    });

    socket.on('error', err => {
        console.error(`An error occurred on socket from ${socket.remoteAddress}:${socket.remotePort}:`, err);
        sockets.delete(socket);
    });
    
    socket.on('end', () => {
        console.log(`Connection ended by client ${socket.remoteAddress}:${socket.remotePort}`);
        sockets.delete(socket);
    });
});

server.listen(12718, () => {
    console.log('Server listening on port 12718');
});

function handleData(socket, data) {
    const buffer = Buffer.from(data);
    const length = buffer.readUInt32BE(0);
    console.log(`Packet Length: ${length} bytes`);

    if (buffer.length >= length + 4) {
        const rtpPacket = buffer.slice(4, 4 + length);
        const rtpHeader = parseRTPHeader(rtpPacket);
        logRTPHeaderDetails(rtpHeader);
    } else {
        console.error('Incomplete RTP packet received');
    }
}

function broadcastData(sender, data) {
    for (let socket of sockets) {
        if (socket !== sender) { // Send to all except the sender
            socket.write(data.slice(4)); // Send the first 4 bytes (length)
        }
    }
}

function handleData(socket, data) {
    const buffer = Buffer.from(data);

    // First 4 bytes are the length of the RTP packet
    const length = buffer.readUInt32BE(0);
    console.log(`Expected RTP Packet Length: ${length} bytes`);

    if (buffer.length >= length + 4) { // Check if the received data includes the full packet
        const rtpPacket = buffer.slice(4, 4 + length);
        const rtpHeader = parseRTPHeader(rtpPacket);
        logRTPHeaderDetails(rtpHeader);
        
        // You can add more detailed logging or processing of the RTP payload here
    } else {
        console.error('Incomplete RTP packet received. Expected length does not match the received length.');
    }
}

function parseRTPHeader(packet) {
    const buffer = Buffer.from(packet);

    const firstByte = buffer.readUInt8(0);
    const version = (firstByte >> 6) & 0x03;
    const padding = (firstByte >> 5) & 0x01;
    const extension = (firstByte >> 4) & 0x01;
    const cc = firstByte & 0x0F;

    const secondByte = buffer.readUInt8(1);
    const marker = (secondByte >> 7) & 0x01;
    const payloadType = secondByte & 0x7F;

    const sequenceNumber = buffer.readUInt16BE(2);
    const timestamp = buffer.readUInt32BE(4);
    const ssrc = buffer.readUInt32BE(8);

    return {
        version,
        padding,
        extension,
        cc,
        marker,
        payloadType,
        sequenceNumber,
        timestamp,
        ssrc
    };
}

function logRTPHeaderDetails(header) {
    console.log('RTP Header Details:');
    console.log(`Version: ${header.version}`);
    console.log(`Padding: ${header.padding}`);
    console.log(`Extension: ${header.extension}`);
    console.log(`CC: ${header.cc}`);
    console.log(`Marker: ${header.marker}`);
    console.log(`Payload Type: ${header.payloadType}`);
    console.log(`Sequence Number: ${header.sequenceNumber}`);
    console.log(`Timestamp: ${header.timestamp}`);
    console.log(`SSRC: ${header.ssrc}`);
}
