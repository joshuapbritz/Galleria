var express = require('express');
var router = express.Router();
var auth = require('../auth');
var multer = require('multer');
var bd = multer();
var db = require('diskdb');
db = db.connect('./DB', ['users', 'galleries']);

// [GET] Route for making an account
router.get('/signup', function(req, res) {
    res.render('signup', { layout: 'account' });
});

// [POST] Route for making an account
router.post('/signup', bd.array(), function(req, res) {
    var hashedPassword = auth.hashPassword(req.body.password);
    var details = {
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword.passwordHash,
        salt: hashedPassword.salt,
    };

    var isAuth = auth.createUser(details);
    if (isAuth) {
        req.session.Uid = isAuth._id;
        res.redirect('/');
    } else {
        res.redirect('/signup');
    }
});

// [GET] Route for logging in
router.get('/login', (req, res) => {
    res.render('login', { layout: 'account' });
});

// [POST] Route for logging in
router.post('/login', bd.array(), function(req, res) {
    var userDetails = auth.login(req.body.username, req.body.password);
    if (userDetails) {
        req.session.Uid = userDetails._id;
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

// [GET] Route for logging out
router.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                res.send(err);
            } else {
                res.redirect('/');
            }
        });
    } else {
        res.redirect('/login');
    }
});

// [GET] View account
router.get('/account', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var user = db.users.findOne({ _id: req.session.Uid });
        var galleries = db.galleries.find({ userId: user._id }).length;
        user.numberGalleries = galleries;
        res.render('account', { user: user });
    } else {
        res.redirect('/login');
    }
});

// [GET] Change user password
router.get('/account/changepassword', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var user = db.users.findOne({ _id: req.session.Uid });
        res.render('password', { user: user });
    } else {
        res.redirect('/login');
    }
});

// [POST] Change user password
router.post('/account/changepassword', bd.array(), (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var user = auth.changePassword(
            req.body.username,
            req.body.password,
            req.body.newPassword
        );
        if (user) {
            res.redirect('/account');
        } else {
            res.status(500).send('Something Went Wrong :(');
        }
    } else {
        res.redirect('/login');
    }
});

module.exports = router;
