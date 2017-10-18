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
}

module.exports = new Mailer()
