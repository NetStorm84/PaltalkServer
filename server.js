const net = require('net');
const Buffer = require('buffer').Buffer;
const encryption = require('./encryption');
const helper = require('./helper');
const { sendPacket } = require('./packetSender'); 
const { PACKET_TYPES } = require('./packetHeaders');
const { output } = require('./output');
const Group = require('./Models/Group');
const { log } = require('console');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');
const winston = require('winston');

const SERVER_KEY = 'XyF¦164473312518';
let logger;
let currentUser;
let groups = [];
let categories = [];
let recvBuffer = Buffer.alloc(0);
const currentSockets = new Map()

// initialize the server, create the groups etc
initServer();

const server = net.createServer(socket => {

    socket.on('data', data => handleData(socket, data));
    socket.on('end', () =>  {

        // get the user from the current sockets
        let userSocket = currentSockets.get(socket.id)

        if (userSocket){

            // delete this user from the active sockets
            currentSockets.delete(socket.id);

            // alert all the users that the user has gone offline
            currentSockets.forEach(socket => {
                let userBuddies = JSON.parse(socket.user.buddies);
                userBuddies.forEach(buddy => {
                    if (buddy.uid === userSocket.user.uid){
                        sendPacket(socket.socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from(helper.conversions.decToHex(userSocket.user.uid) + helper.modes.OFFLINE_MODE, 'hex'));
                    }
                });
            });

            // log that a user was removed
            console.log(`${userSocket.user.nickname} removed from active sockets`);
        }
    });
    
    // a socket error occurred
    socket.on('error', err => logger.error(err.message));
});

function handleData(socket, data) {
    // Ensure recvBuffer is scoped properly and initialized if not already
    if (typeof recvBuffer === 'undefined') {
        recvBuffer = Buffer.alloc(0);
    }

    // Create the receive buffer
    recvBuffer = Buffer.concat([recvBuffer, data]);

    while (recvBuffer.length >= 6) {
        const packetType = recvBuffer.readInt16BE(0);
        const version = recvBuffer.readInt16BE(2);
        const length = recvBuffer.readUInt16BE(4);

        if (recvBuffer.length < length + 6) {
            break;
        }

        const payload = recvBuffer.slice(6, length + 6);
        //output.outputToTerminal(packetType, version, length, payload);

        try {
            processPacket(socket, packetType, payload);
            recvBuffer = recvBuffer.slice(length + 6);
        } catch (err) {
            logger.error(err.message);
        }
    }
}

async function processPacket(socket, packetType, payload) {

    switch (packetType) {
        case PACKET_TYPES.ADD_PAL:
            userToAdd = await findUser(parseInt(payload.slice(0, 4).toString('hex'), 16));
            let thisUser = currentSockets.get(socket.id).user;
            let userBuddies = JSON.parse(thisUser.buddies);
            if (!thisUser.buddies.includes(userToAdd.uid)) {
                userBuddies.push({
                    uid: userToAdd.uid,
                    nickname: userToAdd.nickname
                });

                // set the buddies back on the user
                thisUser.buddies = JSON.stringify(userBuddies);

                // update the users buddy list in the database
                db.run(`UPDATE users SET buddies = ? WHERE uid = ?`, [thisUser.buddies, thisUser.uid], (err) => {
                    if (err) {
                        console.error('Error updating user buddies:', err);
                    }
                });

                sendPacket(socket, PACKET_TYPES.BUDDY_LIST, retrieveBuddyList(thisUser));
                userIdHex = helper.conversions.decToHex(userToAdd.uid);
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
            sendPacket(socket, PACKET_TYPES.HELLO, Buffer.from('Hello-From:PaLTALK'));
            break;
        case PACKET_TYPES.XFER_REQUEST:
            let recv = payload.slice(0, 4);
            let recSocket = currentSockets.get(parseInt(recv.toString('hex'), 16));

            let ipAddress = recSocket.socket.remoteAddress;
            
            // Ensure only the IPv4 part is used (for IPv4-mapped IPv6 addresses)
            let ipv4Address = ipAddress.includes('::ffff:') ? ipAddress.split(':').pop() : ipAddress;
            console.log("Remote IP Address:", ipv4Address); // Log the IP Address in standard format

            // Convert IP address to hexadecimal
            let hexAddress = ipv4Address.split('.').map((octet) => {
                return parseInt(octet).toString(16).padStart(2, '0');
            }).join('');

            sendPacket(recSocket.socket, PACKET_TYPES.XFER_ACCEPT, Buffer.from(hexAddress +'0001869f0000082a', 'hex'));
            break;
        case PACKET_TYPES.GET_UIN:
            let usr = await findUser(payload.slice(4).toString('utf8'));
            sendPacket(socket, PACKET_TYPES.UIN_RESPONSE, Buffer.from(`uid=${usr.uid}\nnickname=${usr.nickname}\n`));
            break;
        case PACKET_TYPES.ROOM_BOUNCE:
            bounceUser(socket, payload);
        case PACKET_TYPES.ALERT_ADMIN:
            let group_id = payload.slice(0, 4);
            let reportedUser = payload.slice(4, 8);
            let reason = payload.slice(8);

            //TODO alert online admins to take a look
            break;
        case PACKET_TYPES.ROOM_MESSAGE_OUT:
            let grp_id = payload.slice(0, 4);
            let grp = groups.find(group => group.id === parseInt(grp_id.toString('hex'), 16));
            grp.users.forEach(userInGroup => {
                connectedUser = currentSockets.get(userInGroup.uid);
                if (connectedUser.uid !== socket.id){
                    sendPacket(connectedUser.socket, PACKET_TYPES.ROOM_MESSAGE_IN, Buffer.from(payload.slice(0, 4).toString('hex')+helper.conversions.decToHex(socket.id) + payload.slice(4).toString('hex'), 'hex'));
                }
            });
            break;
        case PACKET_TYPES.REQ_MIC:
            sendPacket(socket, 0x018d, Buffer.from(payload.slice(0, 4), 'hex'));
            break;
        case PACKET_TYPES.ROOM_BANNER_MESSAGE:
            setGroupBanner(socket, payload);
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
        case PACKET_TYPES.ROOM_CREATE:
            //0003000000000000 082a 47 6464646464646464646464
            //00030000 7542 0000 082a 47 64616e64616e64616e
            let roomType = payload.slice(0, 4);
            let catg = payload.slice(4, 6);
            let rating = payload.slice(10, 11);
            let roomName = payload.slice(11);

            let newGrp = {
                id: groups.length + 1,
                catg: helper.conversions.hexToDec(catg.toString('hex')),
                r: rating.toString(),
                v: roomType.toString('hex').includes('03')?1:0,
                p: 0,
                l: 0,
                c: '000000000',
                nm: roomName.toString('utf8'),
                topic: 'Please support our sponsors.',
                mike: 0,
                text: 0
            }

            // create a new temporary group
            let room = new Group(newGrp, false);
            groups.push(room);
            joinRoom(socket, Buffer.alloc(0), room, true);
            break;
        case PACKET_TYPES.LYMERICK:
            console.log('Received Lymerick');
            sendPacket(socket, PACKET_TYPES.LOGIN_NOT_COMPLETE, Buffer.alloc(0));
            sendPacket(socket, PACKET_TYPES.SERVER_KEY, Buffer.from(SERVER_KEY));
            break;
        case PACKET_TYPES.AWAY_MODE:
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from(helper.conversions.decToHex(socket.id) + helper.AWAY_MODE, 'hex'));
            break;
        case PACKET_TYPES.ONLINE_MODE:
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from(helper.conversions.decToHex(socket.id) + helper.ONLINE_MODE, 'hex'));
            break;
        case PACKET_TYPES.IM_OUT:
            let receiver = payload.slice(0, 4);
            let content = payload.slice(4);
            let currentUid = currentSockets.get(socket.id).uid;

            if (receiver.toString('hex') === helper.conversions.decToHex('1000001')){
                parseCommand(currentUid, content, socket);
                return; 
            }
            // how to get the senders uid??
            let senderBuf = Buffer.from(helper.conversions.decToHex(socket.id), 'hex');

            let out = Buffer.concat([senderBuf, content]);
            let receiverClient = currentSockets.get(helper.conversions.hexToDec(receiver));
            if (receiverClient){
                sendPacket(receiverClient.socket, PACKET_TYPES.IM_IN, out);
            }else{
                // receiver is offline store the message
                storeOfflineMessage(currentUid, helper.conversions.hexToDec(receiver), content);
            }
            break;
        case PACKET_TYPES.ROOM_CLOSE:
            //TODO close the room
            break;
        case PACKET_TYPES.ROOM_JOIN_AS_ADMIN:
            checkAdminGroupPassword(socket, payload);
            break;
        case PACKET_TYPES.PACKET_ROOM_ADMIN_INFO:
            let grpid = payload.slice(0, 4);
            sendPacket(socket, PACKET_TYPES.PACKET_ROOM_ADMIN_INFO, Buffer.from('group='+grpid.toString('hex')+'\nmike=1\ntext=1\n', 'utf8'));
            break;
        case PACKET_TYPES.ROOM_JOIN:
            let user = currentSockets.get(socket.id);
            joinRoom(socket, payload, false, user.user.admin);
            break;
        case PACKET_TYPES.ROOM_LEAVE:
            leaveGroup(socket, payload);
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
                db.all(`SELECT * FROM users WHERE nickname = ? AND listed = ?`, [exnick, 1], (err, rows) => {
                    if (err) {
                        console.error('Error querying users by nickname:', err);
                        return;
                    }
                    rows.forEach(row => {
                        searchResults.push({uid: row.uid, ...row});
                    });
                    processSearchResults(searchResults, socket); // Process results after fetching
                });
            }

            // Query for nicknames that start with a specific string
            if (startswith !== undefined) {
                db.all(`SELECT * FROM users WHERE nickname LIKE ? AND listed = ?`, [startswith + '%', 1], (err, rows) => {
                    if (err) {
                        console.error('Error querying users by starting nickname:', err);
                        return;
                    }
                    rows.forEach(row => {
                        searchResults.push({uid: row.uid, ...row});
                    });
                    processSearchResults(searchResults, socket);
                });
            }
            break;
            case PACKET_TYPES.ROOM_START_PUBLISH_VIDEO:
                //TODO start publishing video
                break;
            case PACKET_TYPES.ROOM_STOP_PUBLISH_VIDEO:
                //TODO stop publishing video
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
                
                // get the requested category id
                let catId = payload.slice(8, 12);

                // if the catId is empty
                if (catId.equals(Buffer.from([0x00, 0x00, 0x00, 0x00]))){

                    //return the main categories count
                    sendPacket(socket, PACKET_TYPES.CATEGORY_COUNT, getCategoryCounts());
                }else{

                    // returns the rooms in the category
                    sendPacket(socket, PACKET_TYPES.ROOM_LIST, Buffer.concat(loadGroups(helper.conversions.hexToDec(catId))));
                }
                break;
            default:
                console.log('No handler for received packet type.');
                break;
    }
}

function loadGroups(catId) { 

    let roomBuffers = [];
    roomBuffers.push(Buffer.from('catg='+catId+'\n'));
    roomBuffers.push(Buffer.from([0xC8]));
    
    groups.forEach(room => {
        if (room.catg == catId){
            roomBuffers.push(Buffer.from(`id=${room.id}\nnm=${room.nm}\n#=${room.getUserCount()}\nv=${room.v}\nl=${room.l}\nr=${room.r}\np=${room.p}\nc=000000000`));
            roomBuffers.push(Buffer.from([0xC8]));
        }
    });

    return roomBuffers;
}

function convertToJsonString(obj) {
    return Object.entries(obj).map(([key, value]) => `${key}=${value}`).join('\n');
}

function checkAdminGroupPassword(socket, payload) {
    let user = payload.slice(0, 4);
    let password = payload.slice(4, 8);
    let port = payload.slice(8, 12); // voice port?? (2090)

    if (true){
        room = groups.find(room => room.id === 50002, 16);
        joinRoom(socket, payload, room, true);
    }
}

function setGroupBanner(socket, payload) {
    let gp_id = payload.slice(0, 4);
    let messageH = payload.slice(4).toString('hex');
    let spcrHex = '00000000';
    let cmbHex = gp_id.toString('hex') + spcrHex + messageH;
    let room = lookupRoom(gp_id.toString('hex'));
    finalBuffer = Buffer.from(cmbHex, 'hex');
    room.status_message = payload.slice(4).toString('utf8');
    broadcastGroupPacket(0x015f, finalBuffer, room);
}

//TODO this is not working, bounce the user
function bounceUser(socket, payload) {
    let user = payload.slice(0, 4);
    let room = payload.slice(4, 8);
}

function joinRoom(socket, payload, room = false, isAdmin = false) {

    if (!room){
        room = lookupRoom(payload.slice(0, 4).toString('hex'));
    }

    if (payload.length > 10){
        // get the room password
        let password = payload.slice(10, payload.length);
        if (password.toString('utf8') !== room.password){
            // send a packet to the user that the password is incorrect, if there is one
            return;
        }
    }

    let isInvisible = payload.slice(4,6).includes(1);

    const roomIdHex = helper.conversions.decToHex(room.id);
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

    if (isAdmin && room.v){
        roomType = '00030001';
    }else if (isAdmin && !room.v){
        roomType = '00000001';
    }else if (!isAdmin && room.v){
        roomType = '00030000';   // 001 - private voice conf / 0002 group / 0003 - voice confernece
    }else if (!isAdmin && !room.v){
        roomType = '00000000';
    }

    if (isInvisible && room.v){
        roomType = '0003';
    }else if (isInvisible && !room.v){
        roomType = '0000';
    }

    //0000 = invisible text room
    //0003 invisible voice room

    //roomType = '00030003000100000';



    // if (isAdmin && room.voice){
    //     roomType = VOICE_ROOM | ADMIN;
    // }else if (isAdmin && !room.voice){
    //     roomType = TEXT_ROOM | ADMIN;
    // }else if (!isAdmin && room.voice){
    //     roomType = VOICE_ROOM;
    // }else if (!isAdmin && !room.voice){
    //     roomType = TEXT_ROOM;
    // }

    // join room
    sendPacket(socket, 0x0136, Buffer.from(roomIdHex + roomType + '000000000' +'0b54042a'+'0010006'+'0003'+'47'+helper.conversions.asciiToHex(room.nm)+'' + convertToJsonString(room_details), 'hex'));

    // Add the room message
    let messageHex = Buffer.from(room.getWelcomeMessage()).toString('hex');
    let combinedHex = roomIdHex + spacerHex + messageHex;
    let finalBuffer = Buffer.from(combinedHex, 'hex');
    sendPacket(socket, 0x015e, finalBuffer);

    // add a welcome message
    messageHex = Buffer.from(`${currentUser.user.nickname}, welcome to the room ${room.nm}.`).toString('hex');
    combinedHex = roomIdHex + spacerHex + messageHex;
    finalBuffer = Buffer.from(combinedHex, 'hex');
    sendPacket(socket, 0x015e, finalBuffer);

    // set the welcome message banner
    messageHex = Buffer.from(room.topic).toString('hex');
    combinedHex = roomIdHex + spacerHex + messageHex;
    finalBuffer = Buffer.from(combinedHex, 'hex');
    sendPacket(socket, 0x015f, finalBuffer);

    let buffers = [];

    currentUser.user.admin = isAdmin?1:0;
    room.addUser(currentUser.user, !isInvisible);

    room.users.forEach(user => {
        // Create a string from the user object, format can be adjusted as needed
        if (user.visible){
            let userString = `group_id=${room.id}\nuid=${user.uid}\nnickname=${user.nickname}\nadmin=${user.admin}\ncolor=${user.color}\nmic=${user.mic}\npub=${user.pub}\naway=${user.away}`;
            let userBuffer = Buffer.from(userString);
            buffers.push(userBuffer);
            buffers.push(delim);
        }
    });

    // add eof to the end of the user list
    buffers.push(Buffer.from('eof=1', 'hex'));

    let userList =  Buffer.concat(buffers);
    sendPacket(socket, 0x0154, userList, 'hex');
    room.users.forEach(user => {
        let userSocket = currentSockets.get(user.uid);
        if (userSocket){
            // send the updated list of users to all users in the room
            sendPacket(userSocket.socket, 0x0154, userList, 'hex');
        }
    });
    // sendPacket(socket, -932, Buffer.from(roomIdHex, 'hex'));

    if (room.v){    

        // 0000e9c6 3ff052e6 0001869f 000031ae 

        const ipHex =  'c0a80023';
        const notsure = '0001869f';
        const spacer = '0000';
        const portHex = '082a'; // 12718 (31ae) 082a (2090)
        sendPacket(socket, PACKET_TYPES.ROOM_MEDIA_SERVER, Buffer.from(roomIdHex + ipHex + notsure + spacer + portHex, 'hex'));
        
        // // Some sort of ping? 0xff5e is sent from client, response is 0x00a2 with same payload??
        // sendPacket(socket, 0x00a2, Buffer.from('48f0f128', 'hex')); //72.240.241.40
    }

}

function getCategoryCounts(){

    let catBuffers = [];

    // loop through the groups and count the number of rooms in each category
    categories.forEach(category => {
        let count = groups.filter(group => group.catg === category.code).length;
        if (count > 0){
            catBuffers.push(Buffer.from(`id=${category.code}\n#=${count}`));
            catBuffers.push(Buffer.from([0xC8]));
        }
    });

    return Buffer.concat(catBuffers);
}

function storeOfflineMessage(sender, receiver, content) {

    // Prepare the offline message object
    const offlineMessage = {
        sender: sender,
        receiver: receiver,
        status: 'pending',
        content: content.toString('utf8')
    };

    // Insert the offline message into the SQLite database
    db.run(
        `INSERT INTO offline_messages (sender, receiver, status, content) VALUES (?, ?, ?, ?, ?)`,
        [offlineMessage.sender, offlineMessage.receiver, offlineMessage.status, offlineMessage.content],
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
    return groups.find(room => room.id === parseInt(roomId, 16));
}

async function handleLogin(socket, payload) {

    let currentUid = parseInt(payload.slice(0,4).toString('hex'), 16);
    let user = await findUser(currentUid);
    
    // set the socket id as the users uid
    socket.id = user.uid;

    currentSockets.set(socket.id, {
        uid: user.uid,
        user: user,
        socket: socket
    });
    
    sendPacket(socket, PACKET_TYPES.USER_DATA, Buffer.from(`uid=${user.uid}\nnickname=${user.nickname}\npaid1=${user.paid1}\nbanners=${user.banners}\nrandom=${user.random}\nsmtp=33802760272033402040337033003400278033003370356021203410364036103110290022503180356037302770374030803600291029603310\nadmin=${user.admin}\nph=0\nget_offers_from_us=0\nget_offers_from_affiliates=0\nfirst=${user.first}\nlast=${user.last}\nemail=${user.email}\nprivacy=A\nverified=G\ninsta=6\npub=200\nvad=4\ntarget=${user.uid},${user.nickname}&age:0&gender:-\naol=toc.oscar.aol.com:5190\naolh=login.oscar.aol.com:29999\naolr=TIC:\$Revision: 1.97\$\naoll=english\ngja=3-15\nei=150498470819571187610865342234417958468385669749\ndemoif=10\nip=81.12.51.219\nsson=Y\ndpp=N\nvq=21\nka=YY\nsr=C\nask=Y;askpbar.dll;{F4D76F01-7896-458a-890F-E1F05C46069F}\ncr=DE\nrel=beta:301,302`));
    sendPacket(socket, 0x0064, Buffer.from('fb840000', 'hex'));

    //get the users buddy list
    const buddyList = retrieveBuddyList(user);

    // alert all the users that the user has come online
    currentSockets.forEach(socket => {
        let userBuddies = JSON.parse(socket.user.buddies);
        userBuddies.forEach(buddy => {
            if (buddy.uid === user.uid){
                sendPacket(socket.socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from(helper.conversions.decToHex(user.uid) + '0000001E', 'hex'));
            }
        });
    });

    sendPacket(socket, PACKET_TYPES.BUDDY_LIST, buddyList);
    sendPacket(socket, 0x0064, Buffer.from('fbbd0000', 'hex'));

    // Parse the buddies JSON string into an array
    let buddies = JSON.parse(user.buddies);
    buddies.forEach(buddy => {
        let buddySocket = currentSockets.get(buddy.uid);
        if (buddySocket || (buddy.nickname == 'Paltalk')){
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from(helper.conversions.decToHex(buddy.uid) + '0000001E', 'hex'));
        }
    });

    // this is required to show the buddy list window, not sure why
    sendPacket(socket, PACKET_TYPES.LOGIN_UNKNOWN, Buffer.alloc(0));

    // Prepare the category strings
    const categoryBuffer = [];

    categories.forEach(category => {
        categoryBuffer.push(Buffer.from(`code=${category.code}\nvalue=${category.value}\nlist=2`));
        categoryBuffer.push(Buffer.from([0xC8]));
    });

    // send the categories
    sendPacket(socket, PACKET_TYPES.CATEGORY_LIST, Buffer.concat(categoryBuffer));

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
            let senderBuffer = Buffer.from(helper.conversions.decToHex(message.sender), 'hex');
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

/**
 * 
 * @param {*} socket 
 * @param {*} payload 
 * 
 * Removes the user from the group and
 * broadcasts to the room that the user has left
 */
function leaveGroup(socket, payload) {

    // get the group id from the payload
    let groupId = payload.slice(0, 4).toString('hex');
    
    // get the room the user is leaving
    let group = lookupRoom(groupId);

    // remove user from the room
    group.removeUser(currentSockets.get(socket.id));

    if (group.getUserCount() === 0 && !group.permanant){
        // remove the group from the groups list
        delete groups[groups.indexOf(group)];
    }

    // announce the user has left the room
    broadcastGroupPacket(PACKET_TYPES.ROOM_USER_LEFT, Buffer.from(groupId + helper.conversions.decToHex(socket.id), 'hex'), group);
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

function broadcastGroupPacket(packetType, payload, group) {
    group.users.forEach(user => {
        let userSocket = currentSockets.get(user.uid);
        if (userSocket){
            sendPacket(userSocket.socket, packetType, payload);
        }
    });
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

/**
 * Function to initialize the server
 */
function initServer(){

    // initiate the error logger
    logger = winston.createLogger({
        level: 'error',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        defaultMeta: { service: 'server' },
        transports: [
          new winston.transports.File({ filename: 'error.log', level: 'error' })
        ]
    });

    // create the permanent groups
    loadCategories();
    createGroups();
}

/**
 * load the categories
 */
function loadCategories(){
    db.all(`SELECT * FROM categories JOIN (SELECT 2 AS list)`, (err, rows) => {
        rows.forEach(category => {
            categories.push(category);
        });
    });
}

/**
 * Create the groups from the database
 */
function createGroups(){
    // load all the groups from the database
    db.all(`SELECT * FROM groups`, (err, rows) => {
        rows.forEach(group => {
            let grp = new Group(group, true);
            groups.push(grp);
        });
    });
}

server.listen(5001, () => {
    console.log('Chat Server listening on port 5001');
});