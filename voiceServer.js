const net = require('net');
const fs = require('fs');
const path = require('path');

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

function handleData(socket, data) {

    // Define the path where the data will be saved
    const filePath = path.join(__dirname, 'receivedData.txt');

    // Write the received data to a file
    fs.appendFile(filePath, data.toString('hex') + '\n', (err) => {
        if (err) {
            console.error('Failed to write data to file:', err);
        } else {
            console.log('Data written to file successfully.');
        }
    });
}