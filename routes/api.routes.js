var express = require('express');
var router = express.Router();
var auth = require('../auth');
var multer = require('multer');
var bd = multer();
var db = require('diskdb');
db = db.connect('./DB', ['users', 'galleries']);
var jsonFormat = require('json-format');
var conf = require('../config');

// Get pagination utilities
var utils = require('../utils');

// [GET] Return image urls in a JSON file with pagination activated
router.get('/api/:uid/:name/:page', (req, res) => {
    var gallery = db.galleries.findOne({
        userId: req.params.uid,
        name: req.params.name,
    });
    if (gallery) {
        var records = utils.paginate(
            gallery.files,
            req.params.page,
            gallery.settings.numberOfRecords
        );
        records.galleryName = gallery.name;
        records.cover = gallery.cover;

        res.send(jsonFormat(records, conf.FormatConfig));
    } else {
        res.status(404).send('Gallery not found');
    }
});

// [GET] Return image urls in a JSON file with no pagination
router.get('/api/:uid/:name', (req, res) => {
    var gallery = db.galleries.findOne({
        userId: req.params.uid,
        name: req.params.name,
    });
    if (gallery) {
        var records = {
            files: gallery.files,
            galleryName: gallery.name,
            cover: gallery.cover,
        };
        res.send(jsonFormat(records, conf.FormatConfig));
    } else {
        res.status(404).send('Gallery not found');
    }
});

// [GET] See all registered users
router.get('/api/users', (req, res) => {
    var user = db.users.find();
    var toReturn = [];
    user.forEach(e => {
        var returnString = {};
        returnString.username = e.username;
        var galleries = db.galleries.find({ userId: e._id }).length;
        returnString.numberGalleries = galleries;
        toReturn.push(returnString);
    });
    res.send(toReturn);
});

module.exports = router;
