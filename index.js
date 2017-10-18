var express = require('express');
var exphbs = require('express-handlebars');
var cors = require('express-cors');
var multer = require('multer');
var bd = multer();
var db = require('diskdb');
db = db.connect('./DB', ['users', 'galleries']); //check
var expsession = require('express-session');
var FileStore = require('session-file-store')(expsession);
var garbageCollection = require('./garbage');
var conf = require('./config');
var emailer = require('./emailer');

// Get enviroment from config
var devEnv = conf.devEnv;

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
var router = require('./router');
// Home route
app.use('/', router.home);

// Routes for Accounts
app.use('/', router.accounts);

//-- Routes for Gallery
app.use('/', router.gallery);

//-- Routes for API
app.use('/', router.api);

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
