var express = require('express');
var exphbs = require('express-handlebars');
var cors = require('express-cors');
var multer = require('multer');
var bd = multer();
var db = require('diskdb');
var expsession = require('express-session');
var FileStore = require('session-file-store')(expsession);
var jsonFormat = require('json-format');
var garbageCollection = require('./garbage');
var conf = require('./config');
var emailer = require('./emailer');

// Get enviroment from config
var devEnv = conf.devEnv;

db = db.connect('./DB', ['users', 'galleries']);

var app = express();

// Allow CORS
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept'
    );
    next();
});

//Setup sessions
app.use(
    expsession({
        secret: 'Ice Cream Is Happiness',
        resave: true,
        saveUninitialized: false,
        cookie: { maxAge: 1800000 },
        store: new FileStore(),
    })
);

//Set up the view engine with handlebars
app.engine('handlebars', exphbs({ defaultLayout: 'layout' }));
app.set('view engine', 'handlebars');

var upload = multer({ storage: conf.diskStorage });

//Set up a static folder for assets [eg. CSS, JS, IMAGES, etc]
app.use(express.static('public'));

//Bring in authentication
var auth = require('./auth');

//-- Routes
app.get('/', function(req, res) {
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

// [GET] Route for making an account
app.get('/signup', function(req, res) {
    res.render('signup', { layout: 'account' });
});

// [POST] Route for making an account
app.post('/signup', bd.array(), function(req, res) {
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
app.get('/login', (req, res) => {
    res.render('login', { layout: 'account' });
});

// [POST] Route for logging in
app.post('/login', bd.array(), function(req, res) {
    var userDetails = auth.login(req.body.username, req.body.password);
    if (userDetails) {
        req.session.Uid = userDetails._id;
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

// [GET] Route for logging out
app.get('/logout', (req, res) => {
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

//-- Authorized Routes

// [GET] Load user galleries
app.get('/galleries', (req, res) => {
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
app.get('/galleries/create', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        res.render('create');
    } else {
        res.redirect('/login');
    }
});

// [POST] Create a gallery
app.post('/create-gallery', bd.array(), (req, res) => {
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
app.get('/galleries/upload/:id', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var id = req.params.id;
        res.render('upload', { galleryId: id });
    } else {
        res.redirect('/login');
    }
});

// [POST] Upload images to a gallery
app.post('/upload-images/:id', upload.single('file'), (req, res) => {
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

app.get('/delete-image/:id/:index', (req, res) => {
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
app.get('/gallery/:id', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var gallery = db.galleries.findOne({ _id: req.params.id });
        res.render('view', { gallery: gallery, base: conf.baseUrl });
    } else {
        res.redirect('/login');
    }
});

// [GET] Change a galleries settings
app.get('/gallery/:id/settings', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var gallery = db.galleries.findOne({ _id: req.params.id });
        res.render('settings', { gallery: gallery });
    } else {
        res.redirect('/login');
    }
});

// [POST] Change a galleries settings
app.post('/gallery/:id/settings', bd.array(), (req, res) => {
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
app.get('/gallery/delete/:id', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var id = req.params.id;
        db.galleries.remove({ _id: id });
        garbageCollection.runNow();
        res.redirect('/galleries');
    } else {
        res.redirect('/login');
    }
});

// [GET] View account
app.get('/account', (req, res) => {
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
app.get('/account/changepassword', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var user = db.users.findOne({ _id: req.session.Uid });
        res.render('password', { user: user });
    } else {
        res.redirect('/login');
    }
});

// [POST] Change user password
app.post('/account/changepassword', bd.array(), (req, res) => {
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

//-- Routes for API

// Get pagination utilities
var utils = require('./utils');

// [GET] Return image urls in a JSON file with pagination activated
app.get('/api/:uid/:name/:page', (req, res) => {
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
app.get('/api/:uid/:name', (req, res) => {
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
app.get('/api/users', (req, res) => {
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

// [GET] 404 route
app.get('**', (req, res) => {
    res
        .status(404)
        .render('error', { layout: 'account', route: req.originalUrl });
});

// [POST] 404 route
app.post('**', (req, res) => {
    res
        .status(404)
        .send(
            'Route ' +
                req.originalUrl +
                " doesn't exsist. See [" +
                conf.baseUrl +
                '] for more info about api routes'
        );
});

if (!devEnv) {
    garbageCollection.run(1800000);
} else {
    garbageCollection.run(30000);
}

var port = process.env.PORT || 4500;
app.listen(port, () => {
    console.log('Process started at http://localhost:' + port);
});
