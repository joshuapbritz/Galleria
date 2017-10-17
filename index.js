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

var FormatConfig = {
    type: 'space',
    size: 2,
};

var devEnv = false;

db = db.connect('./DB', ['users', 'galleries']);

var app = express();

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
        cookie: { maxAge: 300000 },
        store: new FileStore(),
    })
);

//Set up the view engine with handlebars
app.engine('handlebars', exphbs({ defaultLayout: 'layout' }));
app.set('view engine', 'handlebars');

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/user_images');
    },
    filename: function(req, file, cb) {
        cb(null, 'user_image_' + Date.now() + '.jpeg');
    },
});
var upload = multer({ storage: storage });

//Set up a static folder for assets [eg. CSS, JS, IMAGES, etc]
app.use(express.static('public'));

//Bring in authentication
var auth = require('./auth');

//Routes
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

app.get('/signup', function(req, res) {
    res.render('signup', { layout: 'account' });
});

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

app.get('/login', (req, res) => {
    res.render('login', { layout: 'account' });
});

app.post('/login', bd.array(), function(req, res) {
    var userDetails = auth.login(req.body.username, req.body.password);
    if (userDetails) {
        req.session.Uid = userDetails._id;
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

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

app.get('/galleries/create', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        res.render('create');
    } else {
        res.redirect('/login');
    }
});

app.get('/galleries/upload/:id', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var id = req.params.id;
        res.render('upload', { galleryId: id });
    } else {
        res.redirect('/login');
    }
});

app.get('/gallery/:id', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var gallery = db.galleries.findOne({ _id: req.params.id });
        res.render('view', { gallery: gallery });
    } else {
        res.redirect('/login');
    }
});

app.get('/gallery/:id/settings', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var gallery = db.galleries.findOne({ _id: req.params.id });
        res.render('settings', { gallery: gallery });
    } else {
        res.redirect('/login');
    }
});

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

        db.galleries.save(gallery);

        res.redirect('/galleries');
    } else {
        res.redirect('/login');
    }
});

app.post('/upload-images/:id', upload.single('file'), (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var id = req.params.id;
        var gallery = db.galleries.findOne({ _id: id });
        console.log(req.file.filename);
        if (devEnv) {
            gallery.files.push(
                'http://localhost:4500/user_images/' + req.file.filename
            );
        } else {
            gallery.files.push(
                'https://gallerya.herokuapp.com/user_images/' +
                    req.file.filename
            );
        }
        gallery.filesRelative.push(req.file.filename);
        if (gallery.cover === '' && gallery.coverRelative === '') {
            gallery.coverRelative = req.file.filename;
            if (devEnv) {
                gallery.cover =
                    'http://localhost:4500/user_images/' + req.file.filename;
            } else {
                gallery.cover =
                    'https://gallerya.herokuapp.com/user_images/' +
                    req.file.filename;
            }
        }
        db.galleries.update({ _id: id }, gallery);
        res.status(200).send(req.file);
    } else {
        res.redirect('/login');
    }
});

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

app.get('/account/changepassword', (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var user = db.users.findOne({ _id: req.session.Uid });
        res.render('password', { user: user });
    } else {
        res.redirect('/login');
    }
});

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

//Routes for API
var utils = require('./utils');
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

        res.send(jsonFormat(records, FormatConfig));
    } else {
        res.status(404).send('Gallery not found');
    }
});

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
        res.send(jsonFormat(records, FormatConfig));
    } else {
        res.status(404).send('Gallery not found');
    }
});

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

app.get('**', (req, res) => {
    res.status(404).send('Not Found');
});

garbageCollection.run();

var port = process.env.PORT || 4500;
app.listen(port, () => {
    console.log('Process started at http://localhost:' + port);
});
