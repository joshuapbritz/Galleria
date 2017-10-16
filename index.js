var express = require('express');
var exphbs = require('express-handlebars');
var cors = require('express-cors');
var multer = require('multer');
var bd = multer();
var db = require('diskdb');
var expsession = require('express-session');
var FileStore = require('session-file-store')(expsession);

db = db.connect('./DB', ['users', 'galleries']);

var app = express();

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

//Allow CORS
app.use(
    cors({
        allowedOrigins: ['*'],
    })
);

//Bring in authentication
var auth = require('./auth');

//Routes
app.get('/', function(req, res) {
    if (auth.authorize(req.session.Uid)) {
        var galleries = db.galleries.find({ userId: req.session.Uid });
        res.render('home', {
            title: 'Hello',
            galleries: galleries,
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

app.post('/create-gallery', bd.array(), (req, res) => {
    if (auth.authorize(req.session.Uid)) {
        var galleryName = req.body.name;
        var gallery = {
            name: galleryName,
            files: [],
            userId: req.session.Uid,
        };

        db.galleries.save(gallery);

        res.redirect('/galleries');
    } else {
        res.redirect('/login');
    }
});

app.post('/upload-images', upload.single('file'), (req, res) => {
    console.log(req.file.filename);
    res.status(200).send(req.file);
});

var port = process.env.PORT || 4500;
app.listen(port, () => {
    console.log('Process started at http://localhost:' + port);
});
