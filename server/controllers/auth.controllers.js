const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const _ = require('lodash');
const User = require('../models/auth.model');

const transport = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "88094891795dfc",
      pass: "5f329ad88cb597"
    }
});

exports.signUp = (req, res) => {
    const { name, email, password } = req.body;

    User.findOne({ email }).exec((err, user) => {
        if (err) {
            return res.status(401).json({ error : 'Something went wrong !!' });
        }

        // i.e. user already exists
        if (user) {
            return res.status(400).json({ error : 'Email already exists !!' });
        }

        const token = jwt.sign({ name, email, password}, process.env.JWT_ACCOUNT_ACTIVATION, { expiresIn : '10m' });

        // Just assign the below link to a variable 
        const activateLink = `${process.env.CLIENT_URL}/auth/activate/${token}`;

        const emailData = {
            to : [
                {
                    address : email,
                    name,                       // name : name,
                }
            ],
            from : {
                address : process.env.EMAIL_FROM,
                name : 'LEARN AUTH'
            },
            subject : 'Account Activation Link',
            html : `
                <div>
                    <h1>Please use the following link to activate the account</h1>

                    <a href="${process.env.CLIENT_URL}/auth/activate/${token}" target="_blank">${activateLink}</a>

                    <hr/>

                    <p>This email may contain sensitive content</p>
                    <a href="${process.env.CLIENT_URL}" target="_blank">${process.env.CLIENT_URL}</a>
                </div>
            `
        }

        transport.sendMail(emailData, (err, info) => {
            if (err) {
                return res.status(400).json({ error : err });
            }

            return res.json({ 
                message : `Email has been successfully sent to ${email}. Follow the instructions in the email to activate the account`
            })
        })
    })
}

exports.activateAccount = (req, res) => {
    const { token } = req.body;

    if (token) {
        return jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, (err) => {
            if (err) {
                return res.status(404).json({ error : 'The link has expired' });
            }

            const { name, email, password } = jwt.decode(token);

            // remember there is no field with name password so this goes to virtual and generate salt and hashed_password
            const newUser = new User({ name, email, password });

            User.findOne({ email }).exec((err, user) => {
                if (err) {
                    return res.status(404).json({ error : 'Something went wrong' });
                }

                if (user) {
                    return res.status(404).json({ error : 'The account has already been activated' });
                }

                newUser.save((err, userData) => {
                    if (err) {
                        return res.status(404).json({ error : 'Something went wrong' });
                    }

                    return res.json({ message : `Hey ${name}, Welcome to the app!!` });
                })
            })
        })
    }
}

exports.sighIn = (req, res) => {
    const { email, password } = req.body;

    User.findOne({ email }).exec((err, user) => {
        if(err) {
            return res.status(400).json({ error : "Something went wrong!!"});
        }

        if(!user) {
            return res.status(400).json({ error : "User with the specified email does not exist!!"});
        }

        // user can use this authenticate method bcz User is an instance of UserSchema and we are finding this user from User.
        if (!user.authenticate(password)) {
            return res.status(400).json({ error : "Password is Incorrect!!"});
        }

        // created this token to use in signin. By this user dont have to sign in again and again
        const token = jwt.sign({ _id : user._id }, process.env.JWT_SECRET, { expiresIn : '7d' });

        const { _id, name, role, email } = user;

        return res.json({ 
            token,
            user : {
                _id,
                name,
                role,
                email
            },
            message : 'Signed In Succesfullly!!'
        })
    })
}

exports.forgotPassword =(req, res) => {
    const { email } = req.body;

    User.findOne({ email }).exec((err, user) => {
        if (err) {
            return res.status(400).json({ error : 'Something went wrong'});
        }

        if (!user) {
            return res.status(400).json({ error : 'User does not exist!!'});
        }

        const token = jwt.sign({ _id : user._id, name : user.name }, process.env.JWT_RESET_PASSWORD, { expiresIn : '10m' });

        // front-end
        const link = `${process.env.CLIENT_URL}/auth/password/reset/${token}`;

        const emailData = {
            from : process.env.EMAIL_FROM,
            to : email,
            subject : 'Password Reset Link',
            html : `
                <h1>Please use the following link to reset your password</h1>

                <a href="${link}" target="_blank">${link}</a>
            `
        }

        // Remember this one
        // we are updating resetPasswordLink to the user field because, when we reset password, we need something by which we can recognize, okay this user wnat to reset the password
        // this guy is someone to whome I have sent the email
        return user.updateOne({ resetPasswordLink : token }).exec((err, sucess) => {
            if (err) {
                return res.status(400).json({ error : 'There was a error in saving the reset password link'});
            }

            transport.sendMail(emailData).then(() => {
                return res.json({ message : `Email has been successfully sent to ${email}` });
            }).catch((err) => {
                return res.status(400).json({ error : 'There was an error in sending the email' });
            })
        })
    })
}

exports.resetPassword = (req, res) => {
    // or we can use token in place of resetPasswordLink and then we can decode the token to get the _id, name and then do domething
    const { resetPasswordLink, newPassword } = req.body;

    if (resetPasswordLink) {
        // to verify this link, I need a key which was used to jenerate this link, i.e. JWT_RESET_PASSWORD
        // You can not verify withot the secret key
        return jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, (err) => {
            if (err) {
                return res.status(404).json({ error : 'Link has been expired!! Try Again!!' });
            }

            User.findOne({ resetPasswordLink }).exec((err, user) => {
                if (err || !user) {
                    return res.status(404).json({ error : 'Something went wrong!!'})
                }

                const updateFields = {
                    password : newPassword,
                    resetPasswordLink : ''
                }

                // method of lodash 
                // smoothly update the updateFields to the user instance
                user = _.extend(user, updateFields);

                user.save((err) => {
                    if (err) {
                        return res.status(404).json({ error : 'Error in resetting the password!!' });
                    }

                    return res.json({ message : 'Password has been changed succesfully!!'});
                })
            })
        })
    }
    return res.status(404).json({ error : 'We have not received the reset password link' })
}