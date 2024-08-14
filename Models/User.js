class User {

    uid;
    name;
    email;
    password;
    buddies = [];
    blocked = [];
    admin = 0;
    paid = 0;
    last_login = 0;
    
    constructor(uid, name, email, password, admin, paid, last_login) {
        this.uid = uid;
        this.name = name;
        this.email = email;
        this.password = password;
        this.admin = admin;
        this.paid = paid;
        this.last_login = last_login;
    }
}