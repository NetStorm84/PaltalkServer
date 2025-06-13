# Paltalk Protocol Documentation
## Reverse-Engineered from Paltalk 5.0 Server Implementation (Early 2000s)

This document describes the Paltalk chat and voice communication protocol.

---

## 📡 **PROTOCOL OVERVIEW**

### **Connection Architecture**
- **Chat Server**: TCP connection on port 5001
- **Voice Server**: UDP connection on port 2090 (originally 12718)
- **Protocol Version**: 29 (outgoing packets)
- **Client Version**: Paltalk 5.0 (Early 2000s)

### **Transport Layer**
- **Chat**: TCP with custom packet framing
- **Voice**: UDP with RTP-based audio streaming
- **Data Format**: Binary protocol with hex-encoded data

---

## 📦 **PACKET STRUCTURE**

### **Chat Packet Format**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   Packet Type   │    Version      │     Length      │     Payload     │
│    (2 bytes)    │   (2 bytes)     │   (2 bytes)     │   (N bytes)     │
│   Big Endian    │   Big Endian    │   Big Endian    │   Variable      │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

- **Total Header Size**: 6 bytes
- **Packet Type**: Signed 16-bit integer (can be negative)
- **Version**: Always 29 for outgoing packets
- **Length**: Length of payload in bytes
- **Payload**: Variable length data (hex, ASCII, or binary)

### **Voice Packet Format (RTP)**
```
┌─────────────────┬─────────────────────────────────────────┐
│   Length        │          RTP Packet                     │
│  (4 bytes)      │        (Length bytes)                   │
│  Big Endian     │                                         │
└─────────────────┴─────────────────────────────────────────┘
```

**RTP Header Structure**:
```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|V=2|P|X|  CC   |M|     PT      |       Sequence Number         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           Timestamp                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           Synchronization Source (SSRC) identifier            |
+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+
```

---

## 🔢 **PACKET TYPES**

### **Connection & Authentication**
| Packet Type | Value | Direction | Description |
|-------------|-------|-----------|-------------|
| `CLIENT_HELLO` | -100 | C→S | Initial client connection |
| `HELLO` | -117 | S→C | Server hello response |
| `LYMERICK` | -1130 | C→S | Authentication handshake |
| `LOGIN_NOT_COMPLETE` | -160 | S→C | Authentication in progress |
| `SERVER_KEY` | 0x0474 | S→C | Server authentication key |
| `LOGIN` | -1148 | C→S | User login with credentials |
| `USER_DATA` | 0x019A | S→C | User profile data |
| `LOGIN_UNKNOWN` | 0x04A6 | S→C | Additional login data |

### **User Management**
| Packet Type | Value | Direction | Description |
|-------------|-------|-----------|-------------|
| `BUDDY_LIST` | 0x0043 | S→C | User's buddy/friend list |
| `STATUS_CHANGE` | 0x0190 | S→C | User online/away/offline status |
| `ADD_PAL` | -67 | C→S | Add user to buddy list |
| `USER_SEARCH` | -69 | C→S | Search for users |
| `SEARCH_RESPONSE` | 0x0045 | S→C | User search results |
| `AWAY_MODE` | -600 | C→S | Set user to away |
| `ONLINE_MODE` | -610 | C→S | Set user to online |
| `BLOCK_BUDDY` | -500 | C→S | Block a user |

### **Room Management**
| Packet Type | Value | Direction | Description |
|-------------|-------|-----------|-------------|
| `ROOM_JOIN` | -310 | C→S | Join a chat room |
| `ROOM_JOINED` | 0x0136 | S→C | Room join confirmation |
| `ROOM_LEAVE` | -320 | C→S | Leave a chat room |
| `ROOM_USER_LEFT` | 0x0140 | S→C | User left room notification |
| `ROOM_CREATE` | -300 | C→S | Create new room |
| `ROOM_CLOSE` | -940 | C→S | Close room (admin) |
| `ROOM_JOIN_AS_ADMIN` | -316 | C→S | Join room as administrator |
| `ROOM_MEDIA_SERVER` | 0x013B | S→C | Voice server connection info |

### **Messaging**
| Packet Type | Value | Direction | Description |
|-------------|-------|-----------|-------------|
| `IM_OUT` | -20 | C→S | Send instant message |
| `IM_IN` | 0x0014 | S→C | Receive instant message |
| `ROOM_MESSAGE_OUT` | -350 | C→S | Send room message |
| `ROOM_MESSAGE_IN` | 0x015E | S→C | Receive room message |
| `ROOM_BANNER_MESSAGE` | -351 | C→S | Set room topic/banner |
| `ANNOUNCEMENT` | -39 | S→C | Server announcement |

### **Categories & Room Lists**
| Packet Type | Value | Direction | Description |
|-------------|-------|-----------|-------------|
| `REFRESH_CATEGORIES` | -330 | C→S | Request category/room list |
| `CATEGORY_LIST` | 0x019C | S→C | List of room categories |
| `ROOM_LIST` | 0x014C | S→C | List of rooms in category |
| `CATEGORY_COUNT` | 0x014B | S→C | Room counts per category |

### **Voice/Media**
| Packet Type | Value | Direction | Description |
|-------------|-------|-----------|-------------|
| `REQ_MIC` | -398 | C→S | Request microphone access |
| `UNREQ_MIC` | -399 | C→S | Release microphone |
| `ROOM_START_PUBLISH_VIDEO` | -6010 | C→S | Start video streaming |
| `ROOM_STOP_PUBLISH_VIDEO` | -6012 | C→S | Stop video streaming |

### **Administrative**
| Packet Type | Value | Direction | Description |
|-------------|-------|-----------|-------------|
| `MAINTENANCE_KICK` | 0x002A | S→C | Kick user (maintenance) |
| `ALERT_ADMIN` | -305 | C→S | Alert administrators |
| `PACKET_ROOM_ADMIN_INFO` | 0x0384 | Both | Room admin information |

---

## 🔑 **AUTHENTICATION FLOW**

### **1. Initial Connection**
```
Client → Server: CLIENT_HELLO (-100)
  Payload: None

Server → Client: HELLO (-117)
  Payload: "Hello-From:PaLTALK" (ASCII)
```

### **2. Authentication Handshake**
```
Client → Server: LYMERICK (-1130)
  Payload: Authentication data

Server → Client: LOGIN_NOT_COMPLETE (-160)
  Payload: Empty

Server → Client: SERVER_KEY (0x0474)
  Payload: "XyF¦164473312518" (Server key)
```

### **3. User Login**
```
Client → Server: LOGIN (-1148)
  Payload: [UID (4 bytes)] + [Additional login data]

Server → Client: LOGIN (response with success flag)
  Payload: [UID (4 bytes)] + [Success flag (4 bytes)]

Server → Client: USER_DATA (0x019A)
  Payload: Key-value pairs of user data

Server → Client: BUDDY_LIST (0x0043)
  Payload: Buddy list data with 0xC8 delimiters

Server → Client: LOGIN_UNKNOWN (0x04A6)
  Payload: Additional login completion data
```

---

## 👥 **USER MODES & STATUS**

### **Status Values**
- **ONLINE**: `0x1E` (30)
- **AWAY**: `0x46` (70)  
- **OFFLINE**: `0x00` (0)

### **User Permissions**
- **Regular User**: `0` 
- **Moderator**: `1`
- **Admin**: `2`
- **Super Admin**: `3`

---

## 🏠 **ROOM SYSTEM**

### **Room Types**
- **Text Room**: `0x00000000`
- **Voice Room**: `0x00030000` 
- **Text Room (Admin)**: `0x00000001`
- **Voice Room (Admin)**: `0x00030001`

### **Room Creation Packet**
```
Payload Structure:
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Room Type   │  Category   │   Unused    │   Rating    │ Room Name   │
│ (4 bytes)   │ (2 bytes)   │ (4 bytes)   │ (1 byte)    │ (Variable)  │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### **Room Join Response**
```
Server → Client: ROOM_JOINED (0x0136)
Payload: [Room ID] + [Room Type] + [Additional room data]

Server → Client: ROOM_MESSAGE_IN (Welcome message)
Server → Client: User list data
Server → Client: Room topic/banner
```

---

## 💬 **MESSAGE FORMATS**

### **Instant Messages**
```
IM_OUT (-20):
┌─────────────┬─────────────────────────────────┐
│ Receiver UID│        Message Content          │
│ (4 bytes)   │         (Variable)              │
└─────────────┴─────────────────────────────────┘

IM_IN (0x0014):
┌─────────────┬─────────────────────────────────┐
│ Sender UID  │        Message Content          │
│ (4 bytes)   │         (Variable)              │
└─────────────┴─────────────────────────────────┘
```

### **Room Messages**
```
ROOM_MESSAGE_OUT (-350):
┌─────────────┬─────────────────────────────────┐
│   Room ID   │        Message Content          │
│ (4 bytes)   │         (Variable)              │
└─────────────┴─────────────────────────────────┘

ROOM_MESSAGE_IN (0x015E):
┌─────────────┬─────────────┬─────────────────────┐
│   Room ID   │ Sender UID  │   Message Content   │
│ (4 bytes)   │ (4 bytes)   │     (Variable)      │
└─────────────┴─────────────┴─────────────────────┘
```

---

## 📋 **DATA FORMATS**

### **Key-Value Data**
Many packets use key-value pair format separated by newlines:
```
uid=1000001
nickname=TestUser
admin=0
color=000000000
```

### **Delimiter-Separated Lists**
Lists (like buddy lists, room lists) use `0xC8` as delimiter:
```
[Data Block 1][0xC8][Data Block 2][0xC8][Data Block 3][0xC8]
```

### **Hexadecimal Encoding**
- **UIDs**: 4-byte integers encoded as 8-character hex strings
- **IP Addresses**: Converted to hex (e.g., `192.168.0.35` → `c0a80023`)
- **Ports**: 2-byte integers in hex (e.g., `2090` → `082a`)

---

## 🎵 **VOICE PROTOCOL**

### **Voice Server Connection**
```
Server → Client: ROOM_MEDIA_SERVER (0x013B)
Payload: [Room ID] + [IP Address (hex)] + [Port] + [Additional data]

Example: Room 59846, IP 192.168.0.35, Port 2090
Payload: 0000e9c6 c0a80023 0001869f 0000 082a
```

### **Voice Data Flow**
1. **Client connects to voice server** via UDP
2. **RTP packets** with 4-byte length prefix
3. **Audio relay** - server broadcasts to all room participants
4. **Control packets**: `0000c353000f4242` and `0000c353000f4244`

### **RTP Audio Format**
- **Standard RTP headers** (12 bytes minimum)
- **Audio payload** follows RTP header
- **Broadcast model** - server relays to all room participants
- **No authentication** on voice server (handled by chat server)

---

## 🔧 **SPECIAL FEATURES**

### **Admin Commands**
Commands sent to UID `1000001` are interpreted as admin commands:
- `/users` - Show online user count
- `/rooms` - Show active room count  
- `/kick <user> [reason]` - Kick user
- `/ban <user> <duration> [reason]` - Ban user
- `/broadcast <message>` - Server announcement
- `/help` - Show command help

### **Room Categories**
Common category codes observed:
- **30018**: General/Social rooms
- **30027**: Quiet/Text-only rooms

### **File Transfer**
```
XFER_REQUEST (-445): Request file transfer
XFER_ACCEPT (0x013B): Accept file transfer with IP/port info
```

### **User Search**
Search supports exact nickname and partial matches using URL-encoded parameters:
```
exnick=ExactNickname
nickname=PartialMatch
```

---

## 🚨 **SECURITY CONSIDERATIONS**

### **Protocol Limitations**
- **No encryption** - all data transmitted in plaintext
- **Basic authentication** - simple server key exchange
- **No message integrity** - packets can be modified
- **Limited rate limiting** in original implementation

### **Implementation Notes**
- **Client IP validation** for file transfers
- **Session management** through socket connections
- **Basic spam protection** through message rate limiting
- **Admin privilege** enforcement on server side

---

## 📊 **IMPLEMENTATION DETAILS**

### **Connection Management**
- **TCP Keep-alive** for chat connections
- **Socket mapping** UID ↔ Socket for message routing
- **Graceful disconnection** handling
- **Idle timeout** (30 minutes default)

### **Message Processing**
- **Packet assembly** from TCP stream
- **Rate limiting** (30 packets/second per connection)
- **Input validation** and sanitization
- **Broadcast patterns** for room messages

### **Database Schema**
Core tables referenced in protocol:
- **users**: User profiles and authentication
- **groups**: Room definitions and settings
- **categories**: Room category listings
- **offline_messages**: Message storage for offline users

---

## 🔍 **REVERSE ENGINEERING NOTES**

This protocol documentation was reverse-engineered from:
- **Paltalk 5.0 client** (early 2000s version)
- **Node.js server implementation** 
- **Network packet captures** (PCAP files)
- **Binary protocol analysis** using hex editors
- **Wireshark dissection** of network traffic

### **Tools Used**
- **OllyDbg**: Client reverse engineering
- **Wireshark**: Network protocol analysis  
- **HxD**: Hex editing for client modification
- **Gaim plugin**: Protocol implementation reference

---

## 📚 **RELATED RESOURCES**

- **Paltalk.fun**: Project homepage
- **Paltalk Wikidot**: Protocol documentation archive
- **PCAP files**: Network capture samples
- **Gaim plugin source**: Alternative implementation

---

*This documentation represents the Paltalk protocol as implemented circa 2002 for Paltalk 5.0. Modern Paltalk implementations may use different protocols, encryption, and security measures.*
