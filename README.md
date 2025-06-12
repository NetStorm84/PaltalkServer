# Paltalk Server - Overhauled Edition

This is a recreation of the Paltalk server from around 2002 using version 5.0 of the Paltalk client. Created in Node.js with a complete overhaul for better maintainability, modularity, and functionality.

## 🚀 Features

- **Modular Architecture**: Clean separation of concerns with organized file structure
- **Voice Server Integration**: Improved voice chat functionality with room-based audio relay
- **Web Dashboard**: Real-time monitoring interface with user/room statistics
- **Enhanced Logging**: Structured logging with different levels and file output
- **Better Error Handling**: Comprehensive error handling and graceful degradation
- **Database Management**: Improved database operations with better error handling
- **WebSocket Support**: Real-time updates for the web interface

## 📁 Project Structure

```
src/
├── config/           # Configuration and constants
├── core/            # Core server functionality
├── database/        # Database management
├── models/          # Data models (User, Room)
├── network/         # Network utilities and packet handling
├── utils/           # Utility functions and logging
├── voice/           # Voice server functionality
├── web/             # Web interface and dashboard
└── server.js        # Main server entry point
```

## 🔧 Setup

### Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository>
   cd serv
   npm install
   ```

2. **Run migration (if upgrading from old version):**
   ```bash
   node migrate.js
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Access the web dashboard:**
   Open your browser to `http://localhost:3000`

### Manual Setup

To get the server up and running manually:

 - `npm install` to install the dependencies.
 - `node database.js` to create the database (or it will be created automatically).
 - `npm start` to start the integrated server.

**Server Ports:**
- Chat Server: `5001` (default)
- Voice Server: `8075` (default) 
- Web Dashboard: `3000` (default)

## 🌐 Web Dashboard

The new web dashboard provides real-time monitoring capabilities:

- **Server Statistics**: Connected users, active rooms, uptime
- **User Management**: View connected users, their status and rooms
- **Room Monitoring**: Active chat rooms and voice channels
- **Live Chat Logs**: Real-time chat message monitoring
- **Admin Controls**: Server management and configuration

Access the dashboard at `http://localhost:3000` when the server is running.

## 🎯 Configuration

Server configuration can be modified in `src/config/constants.js`:

```javascript
const CONFIG = {
    CHAT_PORT: 5001,
    VOICE_PORT: 8075,
    WEB_PORT: 3000,
    MAX_USERS: 100,
    // ... other settings
};
```

## 📊 Logging

Logs are written to the `logs/` directory:
- `combined.log`: All log messages
- `error.log`: Error messages only
- Console output: Real-time monitoring

## 🔧 Development

### Old vs New Structure

The project has been completely overhauled from the original structure:

**Old Structure (preserved in root):**
- `server.js` - Monolithic chat server
- `voiceServer.js` - Separate voice server
- `helper.js` - Mixed utility functions

**New Structure (in src/):**
- Modular, organized components
- Integrated voice and chat servers
- Web interface with real-time monitoring
- Enhanced error handling and logging

### Migration

If you're upgrading from the old server:
1. Run `node migrate.js` to backup original files
2. The old files remain in the root directory for reference
3. New server runs from `src/server.js`

 - `npm install` to install the dependencies.
 - `node database.js` to create the database.
 - Followed by `npm start`. This will initialise the chat server on port 5001 and the voice server on 12718.

### Preparing the client

To prepare the client for connecting to the server we will need to change the IP address of the server that the client is currently trying to connect to. We can do this by downloading the unpacked version of the client and changing the IP address using a HEX editor. I recommend using HxD, link below. 

The client I have available for download below connects to the IP address 192.168.001.16, we can search this IP address within HxD and replace it with our own local IP, remembering that the length must remian the same.

It seems we then need to restart the PC before the client attempts to connect to this new IP address, I think if we have tried connecting before, the IP is also stored in the registry and tries to connect to this IP first. We could delete that entry if it exists... HKEY_CURRENT_USER > Software > PalTalk > host. Maybe we can just change the IP in the registry without modifying the client, I would need to look in to this some more.

I have added a default username and password to the databse setup that we can use to connect to the server. These are listed below. Although, currently, password authentication isn't yet working, so any password would do.

- **Username**: NetStorm
- **Password**: h2kclan

## Resources
Below are a list of resources that were useful in getting the Paltak server recreated.

### External links

[Paltalk.fun](https://paltalk.fun/) This projects main home. Visit here for the latest news and updates regarding this project.

[Paltalk Wikidot](http://paltalk.wikidot.com/introduction) Extremely useful information regarding packets and other tools that were instrumental in getting this up and running

[Olly Dbg](http://www.ollydbg.de/) Tool used to reverse engineer the Paltalk Client

[Wireshark](http://www.wireshark.org/) Used for discecting the pcp file

[WWPack32](https://www.wwpack32.venti.pl/wwpack32_download.html) Used to unpack the original 
Paltalk client

[HxD Hex Editor](https://mh-nexus.de/en/hxd/) Recommended for changing the server IP address within the Paltalk Client

[Resource Hacker](https://www.angusj.com/resourcehacker/) Used to change some strings within the client

[Wayback Machine](https://web.archive.org/) Used to view websites as they were in 2002 and helpful in downloading old tools required to make this work

### Downloads
[Uncompressed version of Patalk 5.0](./resources/Paltalk.zip)

[Wireshark PCAP](./resources/paltalk-secured.pcap.pcapng)

[Gaim Plugin](./resources/gaim-pt.tar.gz) A Paltalk plugin for Gaim, this has been fundamental in getting the server up and running.


![Paltalk client connected to our server recreation](./resources/image.png)
