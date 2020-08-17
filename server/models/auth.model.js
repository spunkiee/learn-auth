const { Schema, model} = require('mongoose');
const crypto = require('crypto');

const UserScema = new Schema({
    name : {
        type : String,
        trim : true,
        required : true,
        max : 32
    },
    email : {
        type : String,
        trim : true,
        required : true,
        unique : true,
        lowercase : true
    },
    hashed_password : {
        type : String,
        required : true
    },
    // salt is basically a key that is combined with the password to make it encrypt.
    // why this is stored in database ?
    // bcz with this salt we generate the password again by encryption method and check wheather it matches with the previous password or not.
    salt : {
        type : String,
        required : true
    },
    role : {
        type : String,
        default : 'Subscriber'
    },
    resetPasswordLink : {
        // for longer strings we use data
        data : String,
        default : '',
    }
}, { timestamps : true })

UserScema.methods = {
    makeSalt : function () {
        return Math.round(new Date().valueOf() * Math.random() + '');
    },

    encryptPassword : function (password) {
        // Remember there is no used of arrow function bcz we uses this keyword inside it.
        if (!password) return '';
        
        try {
            // crypto.createHmac('sha1', this.salt)
            // this applies sha1 algo to salt.
            // crypto.createHmac('sha1', this.salt).update(password)
            // this combine the encrypted salt with the password.
            // crypto.createHmac('sha1', this.salt).update(password).digest('hex')
            // this is used so that no one can use it further in application.
            // some developers store this in variable and use it later on, which is not a good practice.
            return crypto.createHmac('sha1', this.salt).update(password).digest('hex'); 
        } catch (err) {
            return err;
        }
    },

    authenticate : function (password) {
        return this.encryptPassword(password) === this.hashed_password;
    }
}

// virtual means, this is something that I dont want to save in our database, but want to use it for sometime.
// UserScema.virtual('password') -> this is the name of field on which I want to play around
// virtual main jo bhi field pass hoti hai, uss field ki value -> passed in function parameter.
// virtual calls every time when we save something.
UserScema.virtual('password').set(function (password) {
    // temporary variable called _password
    // that is not going to be store in database
    this._password = password;

    // generate salt and save it to our database
    this.salt = this.makeSalt();

    // encrypt the password
    this.hashed_password = this.encryptPassword(password);
}).get(function () {
    // useless funtion but can be used sometime
    return this._password;
    // return this.firstName + this.lastName
    // like I dont wnat to save combined name in a field, So I can return It from here.
})

module.exports = model('users', UserScema);
