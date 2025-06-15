class Group {

    users = [];
    permanant = false;

    constructor(row, permanant = false) {
        Object.assign(this, row);

        // if loaded from the DB, we consider permanant
        this.permanant = permanant;
    }

    getWelcomeMessage() {

        let welcome_message = {
            'G': 'This is a G rated room intended for a General Audience including minors.  Offensive language is not permitted.',
            'A': 'This is a A rated room not intended for minors.  Offensive language is permitted.',
        };

        return welcome_message[this.r];
    }

    getRoomUid() {
        return this.id;
    }

    getUserCount() {
        let count = 0;
        for (let userId in this.users) {
            if (this.users.hasOwnProperty(userId) && this.users[userId].visible) {
                count++;
            }
        }
        return count;
    }

    removeUser(user) {
        delete this.users[user.uid];
    }

    // adds a user to the room
    addUser(user, isVisible = true, isAdmin = false) {

        if (!this.users[user.uid]) {

            // set some defaults
            // Grant mic permission based on room settings and user status
            // Admins always get mic permissions in voice rooms
            // Regular users get mic permissions only if room.mike = 1 (automatic mic enabled)
            if (isAdmin && this.v) {
                user.mic = 1; // Admins always get mic in voice rooms
            } else if (!isAdmin && this.mike === 1) {
                user.mic = 1; // Auto mic enabled for new users
            } else {
                user.mic = 0; // No automatic mic permissions
            }
            
            user.pub = 0;
            user.away = 0;
            user.visible = isVisible;
            
            this.users[user.uid] = user;
            return true;
        }

        return false
    }
}

module.exports = Group;
