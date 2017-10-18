var nodemailer = require('nodemailer');

class Mailer {
    constructor(email, pass) {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: email,
                pass: pass,
            },
        });
    }

    send(mailOptions) {
        this.transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    }

    emailBody(_id) {
        var body = `<div style="width: 100%; height: auto; text-align: center; padding: 60px; font-family: Arial, Helvetica, sans-serif; box-sizing: border-box;"><h2>We Have Recieved Your Request To Reset Your Password For GalleryApi</h2></div><div style="width: 100%; height: auto; text-align: center; padding: 60px; font-family: Arial, Helvetica, sans-serif; box-sizing: border-box;"><a style="width: auto; height: auto; background-color: #5118d6; color: #ffffff; padding: 1.5em 2.5em; box-sizing: border-box;">Reset Password</a></div>`;
    }
}

module.exports = Mailer;
