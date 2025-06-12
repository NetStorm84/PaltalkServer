# Paltalk Server - Complete Setup Guide

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Access the web dashboard:**
   Open your browser to `http://localhost:3000`

## 📋 Server Status

- ✅ Chat Server: Port 5001
- ✅ Voice Server: Port 2090  
- ✅ Web Dashboard: Port 3000
- ✅ Database: SQLite (database.db)
- ✅ Logging: logs/ directory

## 🧪 Testing

Run the test suite to verify everything is working:

```bash
npm test
```

Expected output: All 5 tests should pass.

## 🔧 Configuration

### Server Ports
- **Chat Server**: 5001 (Paltalk client connection)
- **Voice Server**: 2090 (Voice communication)
- **Web Interface**: 3000 (Admin dashboard)

### Environment Configuration
Copy `config.env.example` to `config.env` and modify as needed:

```bash
cp config.env.example config.env
```

## 📁 Project Structure

```
src/
├── config/           # Server configuration
├── core/            # Core server logic
├── database/        # Database management
├── models/          # Data models (User, Room)
├── network/         # Network packet handling
├── utils/           # Utilities and logging
├── voice/           # Voice server
└── web/             # Web interface
```

## 🔌 Client Setup

### Paltalk 5.0 Client Configuration

To connect a Paltalk 5.0 client to your server:

1. **Download the client** (version 5.0 from early 2000s)
2. **Modify the client's server IP:**
   - Use a hex editor (like HxD)
   - Find the default IP address in the client binary
   - Replace with your server's IP address
   - Keep the same string length

3. **Default login credentials:**
   - Username: `NetStorm`
   - Password: Any password (authentication is basic)

4. **Registry cleanup (Windows):**
   - Clear: `HKEY_CURRENT_USER\Software\PalTalk\host`
   - This prevents cached IP addresses

## 🌐 Web Dashboard Features

The web dashboard provides real-time monitoring:

- **Server Statistics**: Uptime, connected users, active rooms
- **User Management**: View connected users and their status
- **Room Monitoring**: Active chat rooms and voice channels  
- **Live Chat Logs**: Real-time message monitoring
- **Admin Controls**: Server management features

### Dashboard URLs
- Main Dashboard: `http://localhost:3000`
- API Endpoints: `http://localhost:3000/api/*`
- WebSocket: `ws://localhost:3000/socket.io/`

## 📊 Monitoring & Logs

### Log Files (in logs/ directory)
- `combined.log`: All server activities
- `error.log`: Error messages only
- Console: Real-time output

### Log Levels
- `error`: Critical errors
- `warn`: Warnings  
- `info`: General information
- `verbose`: Detailed operations
- `debug`: Development debugging

## 🗄️ Database

### SQLite Database (database.db)
- **Users**: User accounts and profiles
- **Rooms**: Chat rooms and categories
- **Categories**: Room categories
- **Messages**: Chat history (if enabled)

### Default Data
- 29 room categories loaded
- 4 permanent rooms created:
  - The Royal Oak (voice)
  - The White Horse (voice)
  - The Tuck INN (voice)
  - The Quiet Side (text only)

## 🔧 Development

### Available Scripts
- `npm start`: Start the production server
- `npm test`: Run test suite
- `npm run migrate`: Migration script
- `npm run start:old`: Start original server (for reference)

### Adding New Features

1. **New packet types**: Add to `src/core/packetProcessor.js`
2. **Database changes**: Modify `src/database/databaseManager.js`
3. **Web features**: Add to `src/web/webInterface.js`
4. **Voice features**: Modify `src/voice/voiceServer.js`

## 🐛 Troubleshooting

### Common Issues

**Server won't start:**
- Check if ports are available (5001, 2090, 3000)
- Verify all dependencies are installed
- Check database.db permissions

**Client can't connect:**
- Verify chat server is on port 5001
- Check client IP configuration
- Clear client registry entries

**Voice not working:**
- Ensure voice server is running (port 2090)
- Check RTP packet handling
- Verify room voice settings

**Web interface errors:**
- Check if port 3000 is available
- Verify socket.io is installed
- Check browser console for errors

### Debug Mode

Start server with debug logging:
```bash
node src/server.js --debug
```

### Performance Monitoring

Use the web dashboard to monitor:
- Connected user count
- Active room statistics
- Message throughput
- Memory usage

## 🔐 Security Notes

- Basic authentication implementation
- No encryption for chat messages (as per original protocol)
- Rate limiting available but basic
- Default setup is for development/testing

## 📚 Original vs Enhanced

### What's New
- ✅ Modular architecture
- ✅ Real-time web dashboard
- ✅ Enhanced error handling
- ✅ Structured logging
- ✅ Voice server improvements
- ✅ Better database management
- ✅ WebSocket integration
- ✅ Automated testing

### What's Preserved
- ✅ Original packet protocol
- ✅ Database schema compatibility
- ✅ Paltalk 5.0 client compatibility
- ✅ Core chat functionality
- ✅ Voice server architecture

## 🤝 Contributing

1. The original server files are preserved in the root directory
2. New development happens in the `src/` directory
3. Test all changes with `npm test`
4. Update documentation as needed

## 📞 Support

- Check the web dashboard for real-time status
- Review log files for detailed error information
- Use the test suite to validate functionality
- Compare with original server files if needed
