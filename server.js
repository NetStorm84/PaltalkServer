const net = require('net');
const { send } = require('process');
const Buffer = require('buffer').Buffer;
const db = require('./db');
const User = require('./userModel');
const { default: mongoose } = require('mongoose');

const users = [
    { uid: 56958546, email:'netstorm1984@gmail.com', nickname: 'NetStorm'},
    { uid: 56958547, email:'test@gmail.com', nickname: '519-Again' },
    { uid: 56958545, email:'test@gmail.com', nickname: 'ebrahimmohammadi' },
    { uid: 56958544, email:'test@gmail.com', nickname: 'roger' },
    { uid: 56958542, email:'test@gmail.com', nickname: 'good_pal' },
    { uid: 56958541, email:'test@gmail.com', nickname: 'Mark' },
    { uid: 0, nickname: 'Paltalk' },
];

async function upsertUsers(users) {
    for (const user of users) {
        const result = await User.updateOne(
            { uid: user.uid },
            { $set: user },
            { upsert: true }
        );
        if (result.upsertedCount > 0) {
            console.log(`User inserted: ${user.nickname}`);
        } else if (result.modifiedCount > 0) {
            console.log(`User updated: ${user.nickname}`);
        } else {
            console.log(`User unchanged: ${user.nickname}`);
        }
    }
}

upsertUsers(users).catch(err => console.error('Error upserting users:', err));

// Packet types
const PACKET_TYPES = {
    LOGIN_NOT_COMPLETE: -160,
    CLIENT_HELLO: -100,
    HELLO: -117,
    GET_UIN: -1131,
    UIN_RESPONSE: 0x046B,
    LYMERICK: -1130,
    REDIRECT: -1143,
    SERVER_KEY: 0x0474,
    LOGIN: -1148,
    USER_DATA: 0x019A,
    BUDDY_LIST: 0x0043,
    LOOKAHEAD: 0x0064,
    STATUS_CHANGE: 0x0190,
    WM_MESSAGE: 0x02B2,
    ANNOUNCEMENT: -39,
    IM_IN: 0x0014,
    ROOM_JOIN: -310,
    VERSIONS: -2102,
    LOGIN_UNKNOWN: 0x04A6,
    BLOCKED_BUDDIES: 0x01FE,
    ROOM_CATEGORIES: 0x019D,
    ROOMS: 0x019E,
    IM_OUT: -20,
    ROOM_JOINED: 0x0136,
    AWAY_MODE: -600,
    ONLINE_MODE: -610,
    ROOM_MESSAGE_OUT: -350,
    ADD_PAL: -67,
    REFRESH_CATEGORIES: -330,
    ALERT_ADMIN: -305,
    INVITE_OUT: -360,
    INVITE_IN: 0x0168,
};

const DEFAULT_HD_SERIAL = '044837C9';
const currentSockets = new Map()

// Buffer handling
let recvBuffer = Buffer.alloc(0);

const server = net.createServer(socket => {
    let currentUid = null;

    socket.on('data', data => handleData(socket, data));
    socket.on('end', () =>  {
        currentSockets.delete(socket.id);
        console.log(`UID ${currentUid} removed from active sockets`);
    });
        
    socket.on('error', err => console.error('An error occurred:', err));
});

function handleData(socket, data) {
    recvBuffer = Buffer.concat([recvBuffer, data]);

    while (recvBuffer.length >= 6) {
        const packetType = recvBuffer.readInt16BE(0);
        const length = recvBuffer.readUInt16BE(4);

        if (recvBuffer.length < length + 6) {
            console.log('Data received is not complete');
            break;
        }

        const payload = recvBuffer.slice(6, length + 6);
        processPacket(socket, packetType, payload);
        recvBuffer = recvBuffer.slice(length + 6);
    }
}

async function processPacket(socket, packetType, payload) {
    console.log(`Received Packet Type: ${packetType}`);
    console.log(`Payload: ${payload.toString('hex')}`);
    let user;

    switch (packetType) {
        case PACKET_TYPES.ADD_PAL:
            userToAdd = await findUser(parseInt(payload.slice(0, 4).toString('hex'), 16));
            let thisUser = currentSockets.get(socket.id).user;
            if (!thisUser.buddies.includes(userToAdd)) {
                thisUser.buddies.push(userToAdd);
                await thisUser.save();
                sendPacket(socket, PACKET_TYPES.BUDDY_LIST, retrieveBuddyList(thisUser));
                userIdHex = userToAdd.uid.toString(16).padStart(8, '0');
                // TODO check the users status and set accordingly
                sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from((userIdHex + '0000001E'), 'hex'));
                console.log('Buddy added successfully');
            } else {
                console.log('Buddy already exists');
            }
            break;
        case PACKET_TYPES.CLIENT_HELLO:
            console.log('Received Client Hello');
            sendPacket(socket, PACKET_TYPES.HELLO, Buffer.from('Hello-From:PaLTALK'));
            break;
        case PACKET_TYPES.GET_UIN:
            console.log('Received Get UIN');
            user = await findUser(payload.slice(4).toString('utf8'));
            sendPacket(socket, PACKET_TYPES.UIN_RESPONSE, Buffer.from(`uid=${user.uid}\nnickname=${user.nickname}\n`));
            break;
        case PACKET_TYPES.ALERT_ADMIN:
            let group_id = payload.slice(0, 4);
            let reportedUser = payload.slice(4, 8);
            let reason = payload.slice(8);

            //TODO alert online admins to take a look
            break;
        case PACKET_TYPES.INVITE_OUT:
            let invitee = payload.slice(4, 8);
            let room_id = payload.slice(0, 4);
            let inviteeClient = currentSockets.get(parseInt(invitee.toString('hex'), 16));
            sendPacket(inviteeClient.socket, PACKET_TYPES.INVITE_IN, Buffer.from(room_id, 'hex'));

            //TODO invite the user to the room
            break;
        case PACKET_TYPES.ROOM_JOINED:
            sendPacket(socket, 0x00a2, Buffer.from('48f0e8bf'));
            break;
        case PACKET_TYPES.LYMERICK:
            console.log('Received Lymerick');
            sendPacket(socket, PACKET_TYPES.LOGIN_NOT_COMPLETE, Buffer.alloc(0));
            sendPacket(socket, PACKET_TYPES.SERVER_KEY, Buffer.from('XyF¦164473312518'));
            break;
        case PACKET_TYPES.AWAY_MODE:
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from('03651e5200000046', 'hex'));
            break;
        case PACKET_TYPES.ONLINE_MODE:
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from('03651e520000001e', 'hex'));
            break;
        case PACKET_TYPES.IM_OUT:
            let receiver = payload.slice(0, 4);
            let content = payload.slice(4);

            if (receiver.toString('hex') === '00000000'){
                parseCommand(currentUid, content, socket);
                return; 
            }

            let out = Buffer.concat([receiver, content])
            let receiverClient = currentSockets.get(parseInt(receiver.toString('hex'), 16))
            if (receiverClient.socket){
                sendPacket(receiverClient.socket, PACKET_TYPES.IM_IN, Buffer.from(out, 'hex'));
            }
            break;
        case PACKET_TYPES.ROOM_JOIN:

            let room = {
                room_id: '59846',
                room_name: 'Private 59846'
            };

            const roomIdHex = parseInt(room.room_id).toString(16).padStart(8, '0');
            const spacerHex = "00000000";
            let currentUser = currentSockets.get(socket.id);
            let delim = Buffer.from([0xC8]);

            // join room
            //sendPacket(socket, PACKET_TYPES.LOOKAHEAD, Buffer.from('fed200000000e9d6000150726976617465203539383436', 'hex'));
            //sendPacket(socket, 0x013b, Buffer.from('0000e9d63ff052e60001869f000031ae', 'hex'));
            sendPacket(socket, 0x0136, Buffer.from('0000e9c600010000000000000bb8232800010006000341507269766174652035393834360a313831373138393239343738383030333335313335333734383339360a3230343833373537353235343431343634393832323231390a4e0a636f6465633d7370657870726f6a2e646c6c0a7175616c3d320a6368616e6e656c733d310a76613d590a73733d460a6f776e3d4E657453746F726D0a63723d35363935383534360a73723d300a7372613d300a7372753d300a7372663d300a7372683d30', 'hex'));
  
            // Add the room message
            let messageHex = Buffer.from("This room is private, meaning the room does not show up in the room list. The only way someone can join this room is by being invited by someone already in the room.").toString('hex');
            let combinedHex = roomIdHex + spacerHex + messageHex;
            let finalBuffer = Buffer.from(combinedHex, 'hex');
            sendPacket(socket, 0x015e, finalBuffer);

            // add a welcome message
            messageHex = Buffer.from(`${currentUser.user.nickname}, welcome to the room ${room.room_name}.`).toString('hex');
            combinedHex = roomIdHex + spacerHex + messageHex;
            finalBuffer = Buffer.from(combinedHex, 'hex');
            sendPacket(socket, 0x015e, finalBuffer);

            // set the welcome message banner
            messageHex = Buffer.from("Please support our sponsors.").toString('hex');
            combinedHex = roomIdHex + spacerHex + messageHex;
            finalBuffer = Buffer.from(combinedHex, 'hex');
            sendPacket(socket, 0x015f, finalBuffer);

            // get the current list of users and set the user list
            let users = [
                {
                    group_id:'59846',
                    uid: '56958546',
                    nickname: 'NetStorm',
                    admin: 0,
                    color: '000128000',
                    mic: 1,
                    pub: 0,
                    away: 0,
                    eof: 'Y'
                },{
                    group_id:'59846',
                    uid: '56958542',
                    nickname: 'good_pal',
                    admin: 1,
                    color: '128000000',
                    mic: 1,
                    pub: 0,
                    away: 0,
                    eof: 'N'
                }
            ];

            let buffers = [];

            users.forEach(user => {
                // Create a string from the user object, format can be adjusted as needed
                let userString = `group_id=${user.group_id}\nuid=${user.uid}\nY=1diap\n1=nimda\nnickname=${user.nickname}\nadmin=${user.admin}\ncolor=${user.color}\nmic=${user.mic}\npub=${user.pub}\naway=${user.away}\neof=${user.eof}`;
                let userBuffer = Buffer.from(userString);
                buffers.push(userBuffer);
                buffers.push(delim);
            });
        
            let userList =  Buffer.concat(buffers);
            sendPacket(socket, 0x0154, userList, 'hex');
            sendPacket(socket, -932, Buffer.from(roomIdHex, 'hex'));

            //turn off red dot? doesnt seem to work
            sendPacket(socket, -397, Buffer.from('0000e9c603651e52','hex'));
            break;
        case PACKET_TYPES.LOGIN:
            console.log('Received Login');
            currentUid = parseInt(payload.slice(0,4).toString('hex'), 16);
            user = await findUser(currentUid);
            const buddyList = retrieveBuddyList(user);

            // set the socket id as the users uid
            socket.id = user.uid;

            currentSockets.set(socket.id, {
                uid: user.uid,
                user: user,
                socket: socket
            });

            let currentUserUidHex = user.uid.toString(16).padStart(8, '0');

            sendPacket(socket, PACKET_TYPES.USER_DATA, Buffer.from(`uid=${user.uid}\nnickname=${user.nickname}\nadmin=1\nget_offers_from_us=0\nget_offers_from_affiliates=0\nprivacy=0\nph=0\nrandom=12345\nemail=netstorm1984@gmail.com\nsup=Y\nprivacy=A\nverified=G\ninsta=6\npub=200\nvad=4\ntarget=${user.uid},${user.nickname}&age:0&gender:-\naol=toc.oscar.aol.com:5190\naolh=login.oscar.aol.com:29999\naolr=TIC:\$Revision: 1.97\$\naoll=english\ngja=3-15\nei=150498470819571187610865342234417958468385669749\ndemoif=10\nip=81.12.51.219\nsson=Y\ndpp=N\nvq=21\nka=YY\nsr=C\nask=Y;askpbar.dll;{F4D76F01-7896-458a-890F-E1F05C46069F}\ncr=DE\nrel=beta:301,302`));
            sendPacket(socket, 0x0064, Buffer.from('fb840000', 'hex'));
            sendPacket(socket, PACKET_TYPES.BUDDY_LIST, buddyList);
            sendPacket(socket, 0x0064, Buffer.from('fbbd0000', 'hex'));

            let delim2 = Buffer.from([0xC8]);
            let cats = Buffer.from('catg=2250\ndisp=200\nname=Friends, Love and Romance');
            let subcats = Buffer.from('catg=2250\nsubcatg=30100\ndisp=470\nname=Rhode Island');
            let catid = Buffer.from('catg=30100','hex');
            //let rooms = Buffer.from('id=10035\np=1\nv=1\nl=0\nr=G\nc=000128000\nnm=My Test Room\n#=19', 'hex');
            //num_members
            let rooms = Buffer.from('id=10035\np=1\nv=1\nl=0\nr=G\nc=000128000\nnm=My Test Room\n#=19');

            // the below is required to show the groups list window
            sendPacket(socket, 0x019c, Buffer.alloc(0));
            // sendPacket(socket, 0x019d, Buffer.concat([cats, delim2]));
            // sendPacket(socket, 0x019e, Buffer.concat([subcats, delim2]));
            // sendPacket(socket, 0x014c, Buffer.concat([catid, delim2, rooms, delim2]));
            
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from((currentUserUidHex + '0000001E'), 'hex'));

            // put the Paltalk buddy online
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from('000000000000001E', 'hex'));
            sendPacket(socket, PACKET_TYPES.LOGIN_UNKNOWN, Buffer.alloc(0));
            break;
        case PACKET_TYPES.REFRESH_CATEGORIES:
            //sendPacket(socket, 0x014d,  Buffer.from('id=2300\nnm=Friends, Love and Romance\u00C8', 'utf8')););
            sendPacket(socket, 0x014d,  Buffer.from('id=2300\nnm=Family and Community\u008cid=2720\nnm=United States & Canada\u008cid=2250\nnm=Friends, Love and Romance\u008cid=32000\nnm=Big Brother\u008cid=3000\nnm=Miscellaneous\u008cid=2200\nnm=Ethnic Groups\u008cid=2950\nnm=Africa\u008cid=9999\nnm=Adult\u008cid=2900\nnm=Middle East\u008cid=2100\nnm=Computers and Technology\u008cid=2050\nnm=Business and Finance\u008cid=2800\nnm=Europe\u008cid=2000\nnm=Help\u008cid=2750\nnm=Asia, Pacific, Oceania\u008cid=2700\nnm=Central & South America\u008cid=2370\nnm=Arts & Entertainment\u008cid=2650\nnm=Sports & Hobbies\u008cid=2600\nnm=Social Issues and Politics\u008cid=2550\nnm=Religion & Spirituality\u008cid=3300\nnm=Shows and Events\u008cid=2500\nnm=Music\u008cid=2450\nnm=Education\u008cid=3200\nnm=Radio/TV\u008cid=2400\nnm=Health\u008cid=2350\nnm=Games\u008c', 'utf8'));
            sendPacket(socket, 0x014c, Buffer.from('id=1\nnm=*** The Royal Oak ***\nc=2300\nr=A\n#=12\np=0\nv=1\nl=0\u00c8'));
            break;
        default:
            console.log('No handler for received packet type.');
            break;
    }
}

function parseCommand(currentUid, content, socket){

    let contentBuffer;
    const command = content.toString('utf8').trim().split(' ', 2); 

    switch (command[0]) {
        case '/alert':
            currentSockets.forEach(user => {
                sendPacket(user.socket, PACKET_TYPES.ANNOUNCEMENT, Buffer.from(content.toString('utf8').replace(command[0], '').trim(), 'utf8'));
                contentBuffer = Buffer.from(`Alert has been sent to all users`, 'utf8');
            });
            break;
        case '/users':
            contentBuffer = Buffer.from(`There are currently ${currentSockets.size} users online`, 'utf8');
            break;
        case '/help':
            contentBuffer = Buffer.from("Commands:\n/users - Number of users currently online\n/help - List all the currently available commands\n/alert {message} - Sends a messagebox alert to all currently connected users", 'utf8');
            break;
        default:
            contentBuffer = Buffer.from("Command not found. Enter /help for a list of commands", 'utf8');
            break;
    }

    // Ensure currentUid is converted to a Buffer properly
    let uidBuffer = Buffer.alloc(4); // Allocate 4 bytes for the UID
    uidBuffer.writeUInt32BE('00000000', 0); // Write the UID as a 4-byte big-endian integer

    // Concatenate the two buffers
    let out = Buffer.concat([uidBuffer, contentBuffer]);

    // Send the packet with the concatenated buffer
    sendPacket(socket, PACKET_TYPES.IM_IN, out);
}

function sendPacket(socket, packetType, payload) {
    const header = Buffer.alloc(6);
    header.writeInt16BE(packetType, 0);
    header.writeUInt16BE(payload.length, 4);
    const packet = Buffer.concat([header, payload]);
    socket.write(packet);
    console.log(`Sent packet of type ${packetType} with payload ${payload.toString('hex')}`);
}

function retrieveBuddyList(user) {
    // Prepare an array to hold all parts including delimiters
    let buffers = [];

    if (!user || !user.buddies) {
        console.log("User data or buddies are not available.");
        return Buffer.from([]);
    }

    // Iterate over the buddies of the user to create buffers
    user.buddies.forEach(buddy => {
        let userBuffer = Buffer.from(`uid=${buddy.uid}\nnickname=${buddy.nickname}`);
        buffers.push(userBuffer);
        buffers.push(Buffer.from([0xC8]));  // Delimiter
    });

    // Concatenate all buffers into one
    return Buffer.concat(buffers);
}

/**
 * Retrieves a user from the MongoDB collection 'users' by UID or nickname.
 * @param {string | number} identifier - UID as a number or nickname as a string.
 * @returns {Promise<Object>} The user document from the database or null if not found.
 */
async function findUser(identifier) {
    let query = {};
    if (typeof identifier === 'number') {
        query.uid = identifier;
    } else if (typeof identifier === 'string') {
        query.nickname = identifier;
    } else {
        throw new Error("Invalid identifier type. Must be a number (uid) or string (nickname).");
    }

    try {
        const user = await User.findOne(query).populate('buddies');
        return user;
    } catch (error) {
        console.error("Failed to retrieve user", error);
        return null;
    }
}

mongoose.connection.on('connected', () => {
    server.listen(5001, () => {
        console.log('Server listening on port 5001 with MongoDB');
    });
});
