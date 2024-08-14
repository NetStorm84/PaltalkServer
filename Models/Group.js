class Group {

    uid;
    name;
    voice = 0;
    locked = 0;
    rating = 'A';
    welcome_message = '';
    status_message = 'Please support our sponsors.';
    users = [];

    constructor(uid, name, voice, locked, rating, status_message, welcome_message) {

        this.uid = uid;
        this.name = name;
        this.voice = voice;
        this.locked = locked;
        this.rating = rating;
        this.status_message = status_message;
        this.welcome_message = welcome_message;
    }

    broadcastGroupPacket(packetType, payload) {
        for (let user in this.users) {
            sendPacket(user.socket, packetType, payload);
        }
    }

    getRoomUid() {
        return this.uid;
    }

    getUserCount() {
        return Object.keys(this.users).length;
    }

    removeUser(user) {
        delete this.users[user.uid];
    }

    // adds a user to the room
    addUser(user) {

        if (!this.users[user.uid]) {

            // set some defaults
            user.mic = 1;
            user.pub = 0;
            user.away = 0;
            
            this.users[user.uid] = user;
            return true;
        }

        return false
    }
}

module.exports = Group;
