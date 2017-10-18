var express = require('express');
var router = express.Router();
var auth = require('../auth');
var db = require('diskdb');
db = db.connect('./DB', ['users']);

// GET route for reading data
router.get('/', function(req, res) {
    if (auth.authorize(req.session.Uid)) {
        var user = db.users.findOne({ _id: req.session.Uid });
        res.render('home', {
            title: 'Hello',
            user: user,
        });
    } else {
        res.redirect('/login');
    }
});

module.exports = router;
