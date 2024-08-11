
function joinRoom(socket, room) {
  socket.join(room);
  socket.emit('joined', room);
}

module.exports = { serverFunctions: { joinRoom } };