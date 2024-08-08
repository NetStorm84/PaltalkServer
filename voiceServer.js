const net = require('net');

// Create a TCP server
const server = net.createServer(socket => {
    let currentUid = null;

    console.log('New connection established');

    // Handle incoming data
    socket.on('data', data => {
        // Output the received data
        console.log(`Data received: ${data.toString('hex')}`);

        // Handle the data here
        handleData(socket, data);
    });

    // Handle end of connection
    socket.on('end', () => {
        console.log(`Connection ended for UID ${currentUid}`);
    });

    // Handle socket errors
    socket.on('error', err => {
        console.error('An error occurred:', err);
    });
});

// Start the server and listen on port 12718
server.listen(12718, () => {
    console.log('Server listening on port 12718');
});

// Placeholder function for handling data
function handleData(socket, data) {
    // Implement your data handling logic here
    console.log(`Handling data: ${data}`);
}