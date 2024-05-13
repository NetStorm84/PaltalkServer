const net = require('net');
const { receivePacket } = require('./packetReceiver');
const { processPacket } = require('./packetProcessor');
const currentSockets = new Map();

const server = net.createServer(socket => {
    socket.on('data', data => receivePacket(socket, data, currentSockets, processPacket));
    socket.on('end', () => {
        currentSockets.delete(socket.id);
        console.log(`Socket ${socket.id} disconnected`);
    });
    socket.on('error', err => console.error('An error occurred:', err));
});

server.listen(5001, () => {
    console.log('Server listening on port 5001');
});
