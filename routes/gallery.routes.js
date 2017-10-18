var express = require('express');
var router = express.Router();
var auth = require('../auth');
var multer = require('multer');
var bd = multer();
var db = require('diskdb');
db = db.connect('./DB', ['users', 'galleries']);
var garbageCollection = require('../garbage');
var conf = require('../config');
var upload = multer({ storage: conf.diskStorage });

// [GET] Load user galleries
router.get('/galleries', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var galleries = db.galleries.find({ userId: req.session.Uid });
        res.render('galleries', {
            title: 'Galleries',
            galleries: galleries,
        });
    } else {
        res.redirect('/login');
    }
});

// [GET] Create a gallery
router.get('/galleries/create', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        res.render('create');
    } else {
        res.redirect('/login');
    }
});

// [POST] Create a gallery
router.post('/create-gallery', bd.array(), (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var galleryName = req.body.name;
        var gallery = {
            name: galleryName,
            cover: '',
            coverRelative: '',
            files: [],
            filesRelative: [],
            userId: req.session.Uid,
            settings: {
                numberOfRecords: 18,
            },
        };

        var galleryData = db.galleries.save(gallery);

        res.redirect('/galleries/upload/' + galleryData._id);
    } else {
        res.redirect('/login');
    }
});

// [GET] Upload images to a gallery
router.get('/galleries/upload/:id', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var id = req.params.id;
        res.render('upload', { galleryId: id });
    } else {
        res.redirect('/login');
    }
});

// [POST] Upload images to a gallery
router.post('/upload-images/:id', upload.single('file'), (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        // Get the ID of the gallery fromthe route params
        var id = req.params.id;

        // Fin the gallery in the DB
        var gallery = db.galleries.findOne({ _id: id });

        // Add the absolute url of the image to the DB
        gallery.files.push(conf.exportUrl + req.file.filename);

        // Add the relative url of the image to the DB
        gallery.filesRelative.push(conf.relativeBase + req.file.filename);

        // If the gallery doesn't have a cover yet, create one
        if (gallery.cover === '' && gallery.coverRelative === '') {
            gallery.coverRelative = conf.relativeBase + req.file.filename;
            gallery.cover = conf.exportUrl + req.file.filename;
        }

        // Update the DB
        db.galleries.update({ _id: id }, gallery);

        // Return successful
        res.status(200).send(req.file);
    } else {
        res.redirect('/login');
    }
});

router.get('/delete-image/:id/:index', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        // Find the gallery
        var gallery = db.galleries.findOne({
            _id: req.params.id,
            userId: req.session.Uid,
        });
        if (gallery) {
            // Get the index of the file to delete
            var index = req.params.index;

            // Check if the cover image needs to be updated
            var changeCover = false;
            if (gallery.files[index] === gallery.cover) {
                changeCover = true;
            }

            // Remove the image
            gallery.files.splice(index, 1);
            gallery.filesRelative.splice(index, 1);

            // If the cover needed to be updated, update it
            if (changeCover) {
                gallery.cover = gallery.files[0];
                gallery.coverRelative = gallery.filesRelative[0];
            }

            // Update the DB
            db.galleries.update({ _id: gallery._id }, gallery);

            // Return
            res.redirect('/gallery/' + req.params.id);
        }
    } else {
        res.redirect('/login');
    }
});

// [GET] View a gallery
router.get('/gallery/:id', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var gallery = db.galleries.findOne({ _id: req.params.id });
        res.render('view', { gallery: gallery, base: conf.baseUrl });
    } else {
        res.redirect('/login');
    }
});

// [GET] Change a galleries settings
router.get('/gallery/:id/settings', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var gallery = db.galleries.findOne({ _id: req.params.id });
        res.render('settings', { gallery: gallery });
    } else {
        res.redirect('/login');
    }
});

// [POST] Change a galleries settings
router.post('/gallery/:id/settings', bd.array(), (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var gallery = db.galleries.findOne({ _id: req.params.id });
        gallery.settings.numberOfRecords = Number(req.body.numberOfRecords);
        gallery.name = req.body.galleryName;
        /*Add More Settings here*/
        db.galleries.update({ _id: gallery._id }, gallery);
        res.redirect('/gallery/' + gallery._id);
    } else {
        res.redirect('/login');
    }
});

// [GET] Delete a gallery
router.get('/gallery/delete/:id', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var id = req.params.id;
        db.galleries.remove({ _id: id });
        garbageCollection.runNow();
        res.redirect('/galleries');
    } else {
        res.redirect('/login');
    }
});

module.exports = router;
