const net = require('net');
const { send } = require('process');
const Buffer = require('buffer').Buffer;
const { connectDB } = require('./db');
const User = require('./userModel');

const users = [
    { uid: 56958546, nickname: 'NetStorm' },
    { uid: 56958547, nickname: '519-Again' },
    { uid: 56958545, nickname: 'ebrahimmohammadi' },
    { uid: 56958544, nickname: 'roger' },
    { uid: 56958542, nickname: 'good_pal' },
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

const allUsers = [
    { uid: 56958546, nickname: 'NetStorm' },
    { uid: 56958547, nickname: '519-Again' },
    { uid: 56958545, nickname: 'ebrahimmohammadi' },
    { uid: 56958544, nickname: 'roger' },
    { uid: 56958542, nickname: 'good_pal' },
    { uid: 00000000, nickname: 'Paltalk' },
];

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
    ROOM_JOIN: 0x0136,
    AWAY_MODE: -600,
    ONLINE_MODE: -610,
};

const DEFAULT_HD_SERIAL = '044837C9';
const socketsByUid = new Map();

// Buffer handling
let recvBuffer = Buffer.alloc(0);

const server = net.createServer(socket => {
    let currentUid = null;

    socket.on('data', data => handleData(socket, data));
    socket.on('end', () =>  {
        socketsByUid.delete(currentUid);
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

function processPacket(socket, packetType, payload) {
    console.log(`Received Packet Type: ${packetType}`);
    console.log(`Payload: ${payload.toString('hex')}`);
    let currentUserUid = null;
    let nickname = null;

    switch (packetType) {
        case PACKET_TYPES.CLIENT_HELLO:
            console.log('Received Client Hello');
            sendPacket(socket, PACKET_TYPES.HELLO, Buffer.from('Hello-From:PaLTALK'));
            break;
        case PACKET_TYPES.GET_UIN:
            console.log('Received Get UIN');
            nickname = payload.slice(4).toString('utf8');
            currentUserUid = getUidByNickname(nickname).toString().padStart(8, '0');
            sendPacket(socket, PACKET_TYPES.UIN_RESPONSE, Buffer.from(`uid=${currentUserUid}\nnickname=${nickname}\n`));
            break;
        case PACKET_TYPES.ROOM_JOIN:
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
            let out = Buffer.concat([receiver, content])
            let receiverSocket = socketsByUid.get(receiver)
            if (receiverSocket){
                sendPacket(receiverSocket, PACKET_TYPES.IM_IN, Buffer.from(out, 'hex'));
            }
            break;
        case PACKET_TYPES.ROOM_JOIN:

            sendPacket(socket, PACKET_TYPES.LOOKAHEAD, Buffer.from('fed200000000e9d6000150726976617465203539383436', 'hex'));
            //sendPacket(socket, 0x013b, Buffer.from('0000e9d63ff052e60001869f000031ae', 'hex'));
            sendPacket(socket, 0x0136, Buffer.from('0000e9c600010000000000000bb8232800010006000341507269766174652035393834360a313831373138393239343738383030333335313335333734383339360a3230343833373537353235343431343634393832323231390a4e0a636f6465633d7370657870726f6a2e646c6c0a7175616c3d320a6368616e6e656c733d310a76613d590a73733d460a6f776e3d4E657453746F726D0a63723d35363935383534360a73723d300a7372613d300a7372753d300a7372663d300a7372683d30', 'hex'));
            sendPacket(socket, 0x015e, Buffer.from('0000e9c6000000005468697320726f6f6d20697320707269766174652c206d65616e696e672074686520726f6f6d20646f6573206e6f742073686f7720757020696e2074686520726f6f6d206c6973742e2020546865206f6e6c792077617920736f6d656f6e652063616e206a6f696e207468697320726f6f6d206973206279206265696e6720696e766974656420627920736f6d656f6e6520616c726561647920696e2074686520726f6f6d2e', 'hex'));
            sendPacket(socket, 0x015e, Buffer.from('0000e9c6000000004E657453746F726D2c2077656c636f6d6520746f2074686520726f6f6d20507269766174652035393834362e', 'hex'));
            sendPacket(socket, 0x015f, Buffer.from('0000e9c600000000506c6561736520737570706f7274206f75722073706f6e736f72732e', 'hex'));
            sendPacket(socket, 0x0154, Buffer.from('67726f75705f69643d35393834360a7569643d35363935383534360a6e69636b6e616d653d4E657453746F726D0a61646d696e3d300a636F6C6F723D3030303132383030300a6d69633d310a7075623d4e0a617761793d300a656f663d59c8', 'hex'));
            
            // user joins grop
            sendPacket(socket, 0x0137, Buffer.from('ffeeddccbbaaaabbccddeeff080045000080101700002a060ccac76aea7ec0a8010669c8beeca31e28c3c85c2b2f5018ffffaf5100000137001d005267726f75705f69643d35393834360a7569643d35363935383739350a6e69636b6e616d653d7264666d323030300a61646d696e3d310a636f6c6f723d3030303046460a6d69633d310a617761793d30', 'hex'));
            //sendPacket(socket, 0x015e, Buffer.from('0000e9c6000000003c70623e3c70666f6e7420636f6c6f723d22233022207072656d3d2231223e596f75206861766520696e7669746564207264666d323030303c2f70666f6e743e3c2f70623e', 'hex'));
            sendPacket(socket, PACKET_TYPES.LOOKAHEAD, Buffer.from('fe980000', 'hex'));
            break;
        case PACKET_TYPES.LOGIN:
            console.log('Received Login');
            currentUserHexUid = parseInt(payload.slice(0,4).toString('hex'), 16);
            user = getUserByUid(currentUserHexUid);
            const palList = createUserBuffer();

            // get the user from the db
            currentUserUid = getUidByNickname(user.nickname);
            socketsByUid.set(currentUserUid, socket)
            currentUserUidHex = user.uid.toString(16).padStart(8, '0');

            sendPacket(socket, PACKET_TYPES.USER_DATA, Buffer.from(`uid=${user.uid}\nnickname=${user.nickname}\nplus=1\nemail=mebrahim@gmail.com\nprivacy=A\nverified=G\nadmin=1\ninsta=6\npub=200\nvad=4\ntarget=${user.uid},${user.nickname}&age:0&gender:-\naol=toc.oscar.aol.com:5190\naolh=login.oscar.aol.com:29999\naolr=TIC:\$Revision: 1.97\$\naoll=english\ngja=3-15\nei=150498470819571187610865342234417958468385669749\ndemoif=10\nip=81.12.51.219\nsson=Y\ndpp=N\nvq=21\nka=YY\nsr=C\nask=Y;askpbar.dll;{F4D76F01-7896-458a-890F-E1F05C46069F}\ncr=DE\nrel=beta:301,302`));
            sendPacket(socket, PACKET_TYPES.BUDDY_LIST, palList);
            sendPacket(socket, PACKET_TYPES.LOGIN_UNKNOWN, Buffer.alloc(0));
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from((currentUserUidHex + '0000001E'), 'hex'));

            // put the Paltalk buddy online
            sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from('000000000000001E', 'hex'));

            // sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from('03651E510000001e', 'hex'));
            //sendPacket(socket, PACKET_TYPES.STATUS_CHANGE, Buffer.from('000000010000001e', 'hex'));
            //NetStorm: 4E657453746F726D
            // join room
            // sendPacket(socket, PACKET_TYPES.LOOKAHEAD, Buffer.from('fed200000000e9d6000150726976617465203539383436', 'hex'));
            // //sendPacket(socket, 0x013b, Buffer.from('0000e9d63ff052e60001869f000031ae', 'hex'));
            // sendPacket(socket, 0x0136, Buffer.from('0000e9c600010000000000000bb8232800010006000341507269766174652035393834360a313831373138393239343738383030333335313335333734383339360a3230343833373537353235343431343634393832323231390a4e0a636f6465633d7370657870726f6a2e646c6c0a7175616c3d320a6368616e6e656c733d310a76613d590a73733d460a6f776e3d4E657453746F726D0a63723d35363935383534360a73723d300a7372613d300a7372753d300a7372663d300a7372683d30', 'hex'));
            // sendPacket(socket, 0x015e, Buffer.from('0000e9c6000000005468697320726f6f6d20697320707269766174652c206d65616e696e672074686520726f6f6d20646f6573206e6f742073686f7720757020696e2074686520726f6f6d206c6973742e2020546865206f6e6c792077617920736f6d656f6e652063616e206a6f696e207468697320726f6f6d206973206279206265696e6720696e766974656420627920736f6d656f6e6520616c726561647920696e2074686520726f6f6d2e', 'hex'));
            // sendPacket(socket, 0x015e, Buffer.from('0000e9c6000000004E657453746F726D2c2077656c636f6d6520746f2074686520726f6f6d20507269766174652035393834362e', 'hex'));
            // sendPacket(socket, 0x015f, Buffer.from('0000e9c600000000506c6561736520737570706f7274206f75722073706f6e736f72732e', 'hex'));
            // sendPacket(socket, 0x0154, Buffer.from('67726f75705f69643d35393834360a7569643d35363935383534360a6e69636b6e616d653d4E657453746F726D0a61646d696e3d300a636F6C6F723D3030303132383030300a6d69633d310a7075623d4e0a617761793d300a656f663d59c8', 'hex'));
            
            // // user joins grop
            // sendPacket(socket, 0x0137, Buffer.from('ffeeddccbbaaaabbccddeeff080045000080101700002a060ccac76aea7ec0a8010669c8beeca31e28c3c85c2b2f5018ffffaf5100000137001d005267726f75705f69643d35393834360a7569643d35363935383739350a6e69636b6e616d653d7264666d323030300a61646d696e3d310a636f6c6f723d3030303046460a6d69633d310a617761793d30', 'hex'));
            // //sendPacket(socket, 0x015e, Buffer.from('0000e9c6000000003c70623e3c70666f6e7420636f6c6f723d22233022207072656d3d2231223e596f75206861766520696e7669746564207264666d323030303c2f70666f6e743e3c2f70623e', 'hex'));
            // sendPacket(socket, PACKET_TYPES.LOOKAHEAD, Buffer.from('fe980000', 'hex'));
            // //sendPacket(socket, 0xff06, Buffer.alloc(0));
            //sendPacket(socket, 0x018d, Buffer.from('03651e52','hex'));
            // sendPacket(socket, PACKET_TYPES.ROOM_CATEGORIES, Buffer.from('636174673d323330300a646973703d313030300a6e616d653d46616d696c7920616e6420436f6d6d756e6974790ac80a636174673d323732300a646973703d3335300a6e616d653d556e697465642053746174657320262043616e6164610ac80a636174673d323235300a646973703d3230300a6e616d653d467269656e64732c204c6f766520616e6420526f6d616e63650ac80a636174673d333030300a646973703d313830300a6e616d653d4d697363656c6c616e656f75730ac80a636174673d323230300a646973703d3830300a6e616d653d4574686e69632047726f7570730ac80a636174673d323935300a646973703d3535300a6e616d653d4166726963610ac80a636174673d393939390a646973703d323030300a6e616d653d4164756c740ac80a636174673d323930300a646973703d3530300a6e616d653d4d6964646c6520456173740ac80a636174673d323130300a646973703d313230300a6e616d653d436f6d70757465727320616e6420546563686e6f6c6f67790ac80a636174673d323035300a646973703d313430300a6e616d653d427573696e65737320616e642046696e616e63650ac80a636174673d323830300a646973703d3430300a6e616d653d4575726f70650ac80a636174673d323030300a646973703d3130300a6e616d653d48656c700ac80a636174673d323735300a646973703d3630300a6e616d653d417369612c20506163696669632c204f6365616e69610ac80a636174673d323730300a646973703d3730300a6e616d653d43656e7472616c202620536f75746820416d65726963610ac80a636174673d323337300a646973703d3935300a6e616d653d41727473202620456e7465727461696e6d656e740ac80a636174673d323635300a646973703d313330300a6e616d653d53706f727473202620486f62626965730ac80a636174673d323630300a646973703d3330300a6e616d653d536f6369616c2049737375657320616e6420506f6c69746963730ac80a636174673d323535300a646973703d3930300a6e616d653d52656c6967696f6e20262053706972697475616c6974790ac80a636174673d333330300a646973703d3135300a6e616d653d53686f777320616e64204576656e74730ac80a636174673d323530300a646973703d313630300a6e616d653d4d757369630ac80a636174673d323435300a646973703d313530300a6e616d653d456475636174696f6e0ac80a636174673d333230300a646973703d3235300a6e616d653d526164696f2f54560ac80a636174673d323430300a646973703d313130300a6e616d653d4865616c74680ac80a636174673d323335300a646973703d313730300a6e616d653d47616d65730ac80a', 'hex'));
            // sendPacket(socket, PACKET_TYPES.ROOMS, Buffer.from('636174673d323530300a737562636174673d3635300a646973703d3635300a6e616d653d4f6c64696573c80a636174673d323337300a737562636174673d3630300a646973703d3630300a6e616d653d54656c65766973696f6ec80a636174673d323732300a737562636174673d3437300a646973703d3437300a6e616d653d52686f64652049736c616e64c80a636174673d323732300a737562636174673d3131300a646973703d3131300a6e616d653d47656f72676961c80a636174673d323435300a737562636174673d3230300a646973703d3230300a6e616d653d4c6561726e20446966666572656e74204c616e677561676573c80a636174673d323337300a737562636174673d3230300a646973703d3230300a6e616d653d43656c656272697479205761746368c80a636174673d323635300a737562636174673d3435300a646973703d3435300a6e616d653d4f7574646f6f7273c80a636174673d393939390a737562636174673d3430300a646973703d3430300a6e616d653d506c617967726f756e64c80a636174673d323130300a737562636174673d3530300a646973703d3530300a6e616d653d536f667477617265c80a636174673d323930300a737562636174673d393030300a646973703d393030300a6e616d653d4f74686572c80a636174673d323830300a737562636174673d3530300a646973703d3530300a6e616d653d537061696ec80a636174673d323235300a737562636174673d3730300a646973703d3730300a6e616d653d3430277320616e642035302773c80a636174673d323732300a737562636174673d3530300a646973703d3530300a6e616d653d536f7574682044616b6f7461c80a636174673d323130300a737562636174673d3130300a646973703d3130300a6e616d653d436f6d6d756e69636174696f6e732026204e6574776f726b696e67c80a636174673d323830300a737562636174673d3130300a646973703d3130300a6e616d653d4672616e6365c80a636174673d323235300a737562636174673d3330300a646973703d3330300a6e616d653d476179202f204c65736269616e202f204269c80a636174673d323330300a737562636174673d3335300a646973703d3335300a6e616d653d486f6d6520262047617264656e696e67c80a636174673d323732300a737562636174673d3436300a646973703d3436300a6e616d653d517565626563c80a636174673d323732300a737562636174673d3130300a646973703d3130300a6e616d653d466c6f72696461c80a636174673d323930300a737562636174673d313235300a646973703d313235300a6e616d653d59656d656ec80a636174673d333230300a737562636174673d313030300a646973703d313030300a6e616d653d4d6f76696573c80a636174673d323735300a737562636174673d3830300a646973703d3830300a6e616d653d566965746e616dc80a','hex'));
            //sendPacket(socket, PACKET_TYPES.ROOM_JOIN, Buffer.from('000063af00000000082a', 'hex'));
            // sendPacket(socket, 0x083a, Buffer.from('008f3130303238333532363838343735333539373230393730363732353937353935343636363830353635333734', 'hex'));
            // sendPacket(socket, 0x0837, Buffer.from('0058003a00001d30313130383935393531333930383233363836393131343133303738303037373839363633393339373432313836383336383536373532323835373037363533313337383136383134323930353532323435383537373834373437303538373635323535313331303038303537383835303234343934343331303936373134383035323332323039363633383137343834383131383730313434373631383532333133373831383638363831343730313436333534323935383239373634393135363330353730393530383437323930353437373835303239', 'hex'));
            // sendPacket(socket, 0x007a, Buffer.from('0058003a00001d30313130383935393531333930383233363836393131343133303738303037373839363633393339373432313836383336383536373532323835373037363533313337383136383134323930353532323435383537373834373437303538373635323535313331303038303537383835303234343934343331303936373134383035323332323039363633383137343834383131383730313434373631383532333133373831383638363831343730313436333534323935383239373634393135363330353730393530383437323930353437373835303239', 'hex'));
            break;
        default:
            console.log('No handler for received packet type.');
            break;
    }
}

function sendPacket(socket, packetType, payload) {
    const header = Buffer.alloc(6);
    header.writeInt16BE(packetType, 0);
    header.writeUInt16BE(payload.length, 4);
    const packet = Buffer.concat([header, payload]);
    socket.write(packet);
    console.log(`Sent packet of type ${packetType} with payload ${payload.toString('hex')}`);
}

function createUserBuffer() {

    // Prepare an array to hold all parts including delimiters
    let buffers = [];

    // Iterate over users to create buffers and add delimiters
    allUsers.forEach((user, index) => {
        let userBuffer = Buffer.from(`uid=${user.uid}\nnickname=${user.nickname}`);
        buffers.push(userBuffer);
        buffers.push(Buffer.from([0xC8]));
    });

    // Concatenate all buffers into one
    return Buffer.concat(buffers);
}

function getUserByUid(uid) {
    const user = allUsers.find(user => user.uid === uid);
    if (user) {
        return user;
    } else {
        console.log(`No user found with uid: ${uid}`);
        return null;
    }
}

function getUidByNickname(nickname) {
    const user = allUsers.find(user => user.nickname === nickname);
    if (user) {
        return user.uid;
    } else {
        console.log(`No user found with nickname: ${nickname}`);
        return null;
    }
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
        const user = await User.findOne(query);
        return user;
    } catch (error) {
        console.error("Failed to retrieve user", error);
        return null;
    }
}

connectDB().then(() => {
    server.listen(5001, () => {
        console.log('Server listening on port 5001 with MongoDB');
    });
});
