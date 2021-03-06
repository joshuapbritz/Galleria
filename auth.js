var crypto = require('crypto');
var db = require('diskdb');

db = db.connect('./DB', ['users', 'galleries']);

var getAuth = function(uid) {
    if (uid) {
        var user = db.users.findOne({ _id: uid });
        if (user) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
};

var genRandomString = function(length) {
    return crypto
        .randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
};

var sha512 = function(password, salt) {
    var hash = crypto.createHmac(
        'sha512',
        salt
    ); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt: salt,
        passwordHash: value,
    };
};

var createUserHash = function(pass) {
    var salt = genRandomString(20);
    var hashedPassword = sha512(pass, salt);
    return hashedPassword;
};

var makeUser = function(user) {
    var user = db.users.save(user);
    var exsists = db.users.findOne({ _id: user._id });
    if (exsists) {
        return exsists;
    } else {
        return undefined;
    }
};

var loginUser = function(username, password) {
    var user =
        db.users.findOne({ username: username }) ||
        db.users.findOne({ email: username });
    var hashPassword = sha512(password, user.salt);
    if (user.password === hashPassword.passwordHash) {
        return user;
    } else {
        return undefined;
    }
};

var changePassword = function(username, oldPassword, newPassword) {
    var user = db.users.findOne({ username: username });
    if (user) {
        var hashPassword = sha512(oldPassword, user.salt);
        if (hashPassword.passwordHash === user.password) {
            console.log(user);
            var newPass = createUserHash(newPassword);
            user.password = newPass.passwordHash;
            user.salt = newPass.salt;
            db.users.update({ _id: user._id }, user);
            var checked = db.users.findOne({ _id: user._id });
            if (user.password === checked.password) {
                return checked;
            } else {
                return undefined;
            }
        } else {
            return undefined;
        }
    } else {
        return undefined;
    }
};

exports.hashPassword = createUserHash;
exports.createUser = makeUser;
exports.authorize = getAuth;
exports.login = loginUser;
exports.changePassword = changePassword;
