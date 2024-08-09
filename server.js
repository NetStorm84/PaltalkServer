const net = require('net');
const { send } = require('process');
const Buffer = require('buffer').Buffer;
const encryption = require('./encryption');
const { sendPacket } = require('./packetSender'); 
const Group = require('./Models/Group');

let endcryptedString = encryption.encrypt('passsword', 25);
let decryptedString = encryption.decrypt(endcryptedString, 25);
console.log(endcryptedString);
console.log(decryptedString);

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('chat_app.db');
let currentUser;
let groups = [];

// load all the groups
db.all(`SELECT * FROM groups`, (err, rows) => {
    console.log('Loading groups',err);
    rows.forEach(group => {
        let grp = new Group(group.uid, group.name, group.voice, group.locked, group.rating, group.status_message);
        console.log('Group:', grp);
        groups.push(grp);
    });
});

// Packet types
const PACKET_TYPES = {
    LOGIN_NOT_COMPLETE: -160,
    CLIENT_HELLO: -100,
    HELLO: -117,
    GET_UIN: -1131,
    ROOM_MEMBER_COUNT: 0x00A2,
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
    ROOM_LEAVE: -320,
    REQ_MIC: -398,
    MAINTENANCE_KICK: 0x002A,
    UNREQ_MIC: -399,
    ROOM_JOINED: 0x0136,
    VERSIONS: -2102,
    LOGIN_UNKNOWN: 0x04A6,
    BLOCKED_BUDDIES: 0x01FE,
    ROOM_CATEGORIES: 0x019D,
    ROOMS: 0x019E,
    IM_OUT: -20,
    ROOM_MEDIA_SERVER: 0x013B,
    AWAY_MODE: -600,
    ONLINE_MODE: -610,
    ROOM_MESSAGE_OUT: -350,
    SEARCH_RESPONSE: 0x0045,
    USER_SEARCH: -69,
    ADD_PAL: -67,
    REFRESH_CATEGORIES: -330,
    ALERT_ADMIN: -305,
    EMAIL_INVITE: -200,
    BLOCK_BUDDY: -500,
    INVITE_OUT: -360,
    INVITE_IN: 0x0168,
};

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

    console.log(`Received data: ${data.toString('hex')}`);

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
            if (!thisUser.buddies.includes(userToAdd.uid)) {
                thisUser.buddies.push({
                    uid: userToAdd.uid,
                    nickname: userToAdd.nickname
                });
                await usersRef.doc(thisUser.uid.toString()).update({ buddies: thisUser.buddies });
                sendPacket(socket, PACKET_TYPES.BUDDY_LIST, retrieveBuddyList(thisUser));
                userIdHex = uidToHex(userToAdd.uid);
                if (currentSockets.get(userToAdd.uid)){
                    // user is currently online
                    sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from((userIdHex + '0000001E'), 'hex'));
                }
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
        case PACKET_TYPES.REQ_MIC:
            //sendPacket(socket, 0x018d, Buffer.from(payload.slice(0, 4), 'hex'));
            break;
        case PACKET_TYPES.INVITE_OUT:
            let invitee = payload.slice(4, 8);
            let room_id = payload.slice(0, 4);
            let inviteeClient = currentSockets.get(parseInt(invitee.toString('hex'), 16));
            sendPacket(inviteeClient.socket, PACKET_TYPES.INVITE_IN, Buffer.from(room_id, 'hex'));

            //TODO invite the user to the room
            break;
        case PACKET_TYPES.BLOCK_BUDDY:
            break;
        case PACKET_TYPES.LYMERICK:
            console.log('Received Lymerick');
            sendPacket(socket, PACKET_TYPES.LOGIN_NOT_COMPLETE, Buffer.alloc(0));
            sendPacket(socket, PACKET_TYPES.SERVER_KEY, Buffer.from('XyF¦164473312518'));
            break;
        case PACKET_TYPES.AWAY_MODE:
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from(uidToHex(socket.id) + '00000046', 'hex'));
            break;
        case PACKET_TYPES.ONLINE_MODE:
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from(uidToHex(socket.id) + '0000001e', 'hex'));
            break;
        case PACKET_TYPES.IM_OUT:
            let receiver = payload.slice(0, 4);
            let content = payload.slice(4);

            if (receiver.toString('hex') === uidToHex('1000001')){
                parseCommand(currentUid, content, socket);
                return; 
            }

            let out = Buffer.concat([receiver, content]);
            let receiverClient = currentSockets.get(uidToDec(receiver));
            if (receiverClient){
                sendPacket(receiverClient.socket, PACKET_TYPES.IM_IN, Buffer.from(out, 'hex'));
            }else{
                // receiver is offline store the message
                storeOfflineMessage(currentUid, uidToDec(receiver), content);
            }
            break;
        case PACKET_TYPES.ROOM_JOIN:

            let room = lookupRoom(payload.slice(0, 4).toString('hex'));

            const roomIdHex = payload.slice(0, 4).toString('hex');
            const spacerHex = "00000000";
            currentUser = currentSockets.get(socket.id);
            let delim = Buffer.from([0xC8]);

            let room_details = {
                codec: 'spexproj.dll',
                qual: 2,
                channels: 1,
                premium: 1,
                va: 'Y',
                ss:'F',
                own: 'NetStorm',
                cr: '56958546',
                sr: 0,
                sra: 0,
                sru: 0,
                srf: 0,
                srh: 0
            };

            let roomType = room.voice ? '00030001' : '00060001';

            // join room
            sendPacket(socket, 0x0136, Buffer.from(roomIdHex + roomType +'000000000'+'0b54042a'+'0010006'+'0003'+'47'+asciiToHex(room.name)+'' + convertToJsonString(room_details), 'hex'));

            // Add the room message
            let messageHex = Buffer.from("This room is private, meaning the room does not show up in the room list. The only way someone can join this room is by being invited by someone already in the room.").toString('hex');
            let combinedHex = roomIdHex + spacerHex + messageHex;
            let finalBuffer = Buffer.from(combinedHex, 'hex');
            sendPacket(socket, 0x015e, finalBuffer);

            // add a welcome message
            messageHex = Buffer.from(`${currentUser.user.nickname}, welcome to the room ${room.name}.`).toString('hex');
            combinedHex = roomIdHex + spacerHex + messageHex;
            finalBuffer = Buffer.from(combinedHex, 'hex');
            sendPacket(socket, 0x015e, finalBuffer);

            // set the welcome message banner
            messageHex = Buffer.from(room.status_message).toString('hex');
            combinedHex = roomIdHex + spacerHex + messageHex;
            finalBuffer = Buffer.from(combinedHex, 'hex');
            sendPacket(socket, 0x015f, finalBuffer);

            let buffers = [];

            room.addUser(currentUser.user);

            room.users.forEach(user => {
                // Create a string from the user object, format can be adjusted as needed
                user.group_id = room.uid;
                let userString = convertToJsonString(user); //`group_id=${user.group_id}\nuid=${user.uid}\nY=1diap\n1=nimda\nnickname=${user.nickname}\nadmin=${user.admin}\ncolor=${user.color}\nmic=${user.mic}\npub=${user.pub}\naway=${user.away}\neof=${user.eof}`;
                let userBuffer = Buffer.from(userString);
                buffers.push(userBuffer);
                buffers.push(delim);
            });

            // add eof to the end of the user list
            buffers.push(Buffer.from('eof=1', 'hex'));
        
            let userList =  Buffer.concat(buffers);
            sendPacket(socket, 0x0154, userList, 'hex');
            sendPacket(socket, -932, Buffer.from(roomIdHex, 'hex'));

            const ipHex =  'c0a80023';
            const notsure = '0001869f';
            const spacer = '0000';
            const portHex = '31ae'; // 12718
            sendPacket(socket, PACKET_TYPES.ROOM_MEDIA_SERVER, Buffer.from(roomIdHex + ipHex + notsure + spacer + portHex, 'hex'));
            break;
        case PACKET_TYPES.ROOM_LEAVE:
            let roomToLeave = lookupRoom(payload.slice(0, 4).toString('hex'));
            roomToLeave.removeUser(currentUser);
            break;
        case PACKET_TYPES.LOGIN:
            handleLogin(socket, payload);
            break;
        case PACKET_TYPES.USER_SEARCH:
            let searchResults = [];
            let searchQuery = payload.toString('utf8');

            let exnick = getValueByKey(searchQuery, 'exnick');
            let startswith = getValueByKey(searchQuery, 'nickname');

            // Query for exact match of 'nickname'
            if (exnick !== undefined) {
                usersRef.where('nickname', '==', exnick)
                        .where('listed', '==', true).get().then(snapshot => {
                    snapshot.forEach(doc => {
                        searchResults.push({ uid: doc.id, ...doc.data() });
                    });
                    processSearchResults(searchResults, socket); // Process results after fetching
                }).catch(error => {
                    console.error('Error querying users by nickname:', error);
                });
            }

            // Query for nicknames that start with a specific string
            if (startswith !== undefined) {
                usersRef.where('nickname', '>=', startswith)
                        .where('nickname', '<=', startswith + '\uf8ff')
                        .where('listed', '==', true).get().then(snapshot => {
                    snapshot.forEach(doc => {
                        searchResults.push({ uid: doc.id, ...doc.data() });
                    });
                    processSearchResults(searchResults, socket); // Process results after fetching
                }).catch(error => {
                    console.error('Error querying users by starting nickname:', error);
                });
            }
            break;
            case PACKET_TYPES.EMAIL_INVITE:
                // Extract the email from the payload
                let email = getValueByKey(payload.toString('utf8'), 'email');

                // Prepare the email invite object
                const emailInvite = {
                    email: email,
                    requestedAt: new Date().toISOString(), // Store the timestamp in ISO format
                    status: 'pending'
                };

                // Insert the email invite into the SQLite database
                db.run(
                    `INSERT INTO email_invites (email, requestedAt, status) VALUES (?, ?, ?)`,
                    [emailInvite.email, emailInvite.requestedAt, emailInvite.status],
                    function (err) {
                        if (err) {
                            console.error('Error adding email invite to queue:', err.message);
                        } else {
                            console.log('Email invite enqueued with ID:', this.lastID);
                        }
                    }
                );
                break;
            case PACKET_TYPES.REFRESH_CATEGORIES:

                let roomBuffers = [];

                groups.forEach(room => {
                    let roomBuffer = Buffer.from(`id=${room.uid}\nnm=${room.name}\n#=${room.getUserCount()}\nv=${room.voice}\nl=${room.locked}\nr=${room.rating}`);
                    roomBuffers.push(roomBuffer);
                    roomBuffers.push(Buffer.from([0xC8]));
                });

                sendPacket(socket, 0x014e, Buffer.concat(roomBuffers));
                //sendPacket(socket, 0x014c,  Buffer.from('id=12345\nnm=\n#=12\nv=1\nl=0\nr=1\u00c8id=54321\nnm=*** The White Horse ***\n#=24\nv=1\nl=0\nr=1\u00c8', 'utf8'));
                //sendPacket(socket, 0x014e,  Buffer.from('id=2300\nnm=Test ROom\nc=2300\nr=A\n#=12\np=0\nv=1\nl=0\u00c8', 'utf8'));
                //sendPacket(socket, 0x014b,  Buffer.concat([Buffer.from('id=2300\nnm=Family and Community\ncatg=1200'), Buffer.from([0xC8]), Buffer.from('id=2400\nnm=Another Category'), Buffer.from([0xC8])]));
                //sendPacket(socket, 0x014d, Buffer.from('id=1\nnm=*** The Royal Oak ***\nc=2300\nr=A\n#=12\np=0\nv=1\nl=0\u00c8'));
                //sendPacket(socket, 0x014e, Buffer.from('id=1\nnm=*** The Royal Oak ***\nc=2300\nr=A\n#=12\np=0\nv=1\nl=0\u00c8'));
                break;
            default:
                console.log('No handler for received packet type.');
                break;
    }
}

function uidToDec(uid) {
    return parseInt(uid.toString('hex'), 16);
}

function uidToHex(uid) {
    return parseInt(uid).toString(16).padStart(8, '0');
}

function convertToJsonString(obj) {
    return Object.entries(obj).map(([key, value]) => `${key}=${value}`).join('\n');
}

function asciiToHex(str) {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16);
    }
    return hex;
}

function storeOfflineMessage(sender, receiver, content) {
    const sentTime = new Date().toISOString(); // Convert to ISO string format

    // Prepare the offline message object
    const offlineMessage = {
        sender: sender,
        receiver: receiver,
        sent: sentTime,
        status: 'pending',
        content: content.toString('utf8')
    };

    // Insert the offline message into the SQLite database
    db.run(
        `INSERT INTO offline_messages (sender, receiver, sent, status, content) VALUES (?, ?, ?, ?, ?)`,
        [offlineMessage.sender, offlineMessage.receiver, offlineMessage.sent, offlineMessage.status, offlineMessage.content],
        function (err) {
            if (err) {
                console.error('Error adding offline message:', err.message);
            } else {
                console.log('Offline message stored successfully with ID:', this.lastID);
            }
        }
    );
}

function processSearchResults(searchResults, socket) {
    if (searchResults.length > 0) {
        let buffers = [];
        searchResults.forEach(user => {
            let userBuffer = Buffer.from(`uid=${user.uid}\nnickname=${user.nickname}\nfirst=${user.firstname}\nlast=${user.lastname}`);
            buffers.push(userBuffer);
            buffers.push(Buffer.from([0xC8]));
        });
        sendPacket(socket, PACKET_TYPES.SEARCH_RESPONSE, Buffer.concat(buffers));
    }
}

function lookupRoom(roomId) {
    return groups.find(room => room.uid === parseInt(roomId, 16));
}

async function handleLogin(socket, payload) {

    currentUid = parseInt(payload.slice(0,4).toString('hex'), 16);
    user = await findUser(currentUid);
    
    // set the socket id as the users uid
    socket.id = user.uid;

    currentSockets.set(socket.id, {
        uid: user.uid,
        user: user,
        socket: socket
    });
    
    sendPacket(socket, PACKET_TYPES.USER_DATA, Buffer.from(`uid=${user.uid}\nnickname=${user.nickname}\npaid1=${user.plus?6:0}\nbanners=${!user.paid?'yes':'no'}\nrandom=1\nsmtp=33802760272033402040337033003400278033003370356021203410364036103110290022503180356037302770374030803600291029603310\nadmin=${user.admin}\nph=0\nget_offers_from_us=0\nget_offers_from_affiliates=0\nfirst=${user.firstname}\nlast=${user.lastname}\nemail=${user.email}\nprivacy=A\nverified=G\ninsta=6\npub=200\nvad=4\ntarget=${user.uid},${user.nickname}&age:0&gender:-\naol=toc.oscar.aol.com:5190\naolh=login.oscar.aol.com:29999\naolr=TIC:\$Revision: 1.97\$\naoll=english\ngja=3-15\nei=150498470819571187610865342234417958468385669749\ndemoif=10\nip=81.12.51.219\nsson=Y\ndpp=N\nvq=21\nka=YY\nsr=C\nask=Y;askpbar.dll;{F4D76F01-7896-458a-890F-E1F05C46069F}\ncr=DE\nrel=beta:301,302`));
    sendPacket(socket, 0x0064, Buffer.from('fb840000', 'hex'));

    //get the users buddy list
    const buddyList = retrieveBuddyList(user);

    sendPacket(socket, PACKET_TYPES.BUDDY_LIST, buddyList);
    sendPacket(socket, 0x0064, Buffer.from('fbbd0000', 'hex'));

    // Parse the buddies JSON string into an array
    buddies = JSON.parse(user.buddies);
    buddies.forEach(buddy => {
        let buddySocket = currentSockets.get(buddy.uid);
        if (buddySocket || (buddy.nickname == 'Paltalk')){
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from(uidToHex(buddy.uid) + '0000001E', 'hex'));
        }
    });

    // this is required to show the buddy list window, not sure why
    sendPacket(socket, PACKET_TYPES.LOGIN_UNKNOWN, Buffer.alloc(0));

    // the below is required to show the groups list window
    sendPacket(socket, 0x019c, Buffer.alloc(0));

   //send any offline messages
   sendOfflineMessages(user, socket);
}

function sendOfflineMessages(user, socket) {
    db.all(`SELECT * FROM offline_messages WHERE receiver = ? AND status = ?`, [user.uid, 'pending'], (err, rows) => {
        if (err) {
            console.error('Error retrieving offline messages:', err);
            return;
        }

        if (rows.length === 0) {
            console.log('No offline messages to send.');
            return;
        }

        rows.forEach(message => {
            // Ensure that sender and content are converted to buffers if they are strings
            let senderBuffer = Buffer.from(uidToHex(message.sender), 'hex');
            let contentBuffer = Buffer.from(message.content, 'utf8');
            
            // Concatenate both buffers
            let out = Buffer.concat([senderBuffer, contentBuffer]);
    
            // Send the packet (assuming 'out' is a correct buffer)
            sendPacket(socket, PACKET_TYPES.IM_IN, out);
    
            // Update the message status to 'sent'
            db.run(`UPDATE offline_messages SET status = ? WHERE id = ?`, ['sent', message.id], (updateErr) => {
                if (updateErr) {
                    console.error(`Failed to update status of message ${message.id}:`, updateErr);
                } else {
                    console.log(`Message ${message.id} status updated to 'sent' successfully.`);
                }
            });
        });
    });
}

function parseCommand(currentUid, content, socket){

    let contentBuffer;
    const command = content.toString('utf8').trim().split(' ', 2); 

    switch (command[0]) {
        case '/alert':
            broadcastPacket(PACKET_TYPES.ANNOUNCEMENT, Buffer.from(content.toString('utf8').replace(command[0], '').trim(), 'utf8'));
            contentBuffer = Buffer.from(`Alert has been sent to all users`, 'utf8');
            break;
        case '/users':
            contentBuffer = Buffer.from(`There are currently ${currentSockets.size} users online`, 'utf8');
            break;
        case '/help':
            contentBuffer = Buffer.from("Commands:\n/users - Number of users currently online\n/help - List all the currently available commands\n/alert {message} - Sends a messagebox alert to all currently connected users\n/kickall {message} - Removes all users from the server", 'utf8');
            break;
        case '/kickall':
            sendPacket(socket, PACKET_TYPES.MAINTENANCE_KICK, Buffer.from(content.toString('utf8').replace(command[0], '').trim()), 'utf8');
        default:
            contentBuffer = Buffer.from("Command not found. Enter /help for a list of commands", 'utf8');
            break;
    }

    // Ensure currentUid is converted to a Buffer properly
    uidBuffer = Buffer.from('000f4241', 'hex'); // Convert the buffer to a hex string and back to a buffer

    // Concatenate the two buffers
    let out = Buffer.concat([uidBuffer, contentBuffer]);

    // Send the packet with the concatenated buffer
    sendPacket(socket, PACKET_TYPES.IM_IN, out);
}

function retrieveBuddyList(user) {
    let buffers = [];

    if (!user || !user.buddies) {
        console.log("User data or buddies are not available.");
        return Buffer.from([]);
    }

    // Parse the buddies JSON string into an array
    buddies = JSON.parse(user.buddies);

    // Iterate over the buddies of the user to create buffers
    buddies.forEach(buddy => {
        let userBuffer = Buffer.from(`uid=${buddy.uid}\nnickname=${buddy.nickname}`);
        buffers.push(userBuffer);
        buffers.push(Buffer.from([0xC8])); // Add delimiter
    });

    // Concatenate all buffers into one
    return Buffer.concat(buffers);
}

function broadcastPacket(packetType, payload) {
    currentSockets.forEach(({ socket }) => {
        sendPacket(socket, packetType, payload);
    });
}

function getValueByKey(input, key) {

    const pairs = input.split('\n');

    for (let pair of pairs) {
        const [currentKey, value] = pair.split('=');
        if (currentKey === key) {
            return value; 
        }
    }

    return undefined;
}

/**
 * Retrieves a user from the SQLite 'users' table by UID or nickname.
 * @param {string|number} identifier - UID as a number, or a nickname as a string.
 * @returns {Promise<Object|null>} The user object from the database or null if not found.
 */
async function findUser(identifier) {
    return new Promise((resolve, reject) => {
        if (typeof identifier === 'number') {
            // Attempt to retrieve the user by UID
            db.get(`SELECT * FROM users WHERE uid = ?`, [identifier], (err, row) => {
                if (err) {
                    console.error('Error fetching user by UID:', err);
                    reject(err);
                } else {
                    if (row) {
                        console.log('User data:', row);
                        resolve(row);
                    } else {
                        console.log('No such user!');
                        resolve(null);
                    }
                }
            });
        } else if (typeof identifier === 'string') {
            // If not found by UID, attempt to search by nickname
            db.get(`SELECT * FROM users WHERE nickname = ?`, [identifier], (err, row) => {
                if (err) {
                    console.error('Error fetching user by nickname:', err);
                    reject(err);
                } else {
                    if (row) {
                        console.log('User data:', row);
                        resolve(row);
                    } else {
                        console.log('No such user!');
                        resolve(null);
                    }
                }
            });
        } else {
            console.error('Invalid identifier type');
            resolve(null);
        }
    });
}

server.listen(5001, () => {
    console.log('Server listening on port 5001');
});