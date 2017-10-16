var express = require('express');
var router = express.Router();
var exphbs = require('express-handlebars');
var cors = require('express-cors');

var app = express();

//Set up the view engine with handlebars
app.engine('handlebars', exphbs({ defaultLayout: 'layout' }));
app.set('view engine', 'handlebars');

//Allow CORS
app.use(
    cors({
        allowedOrigins: ['*'],
    })
);

// GET route for reading data
router.get('/', function(req, res) {
    res.render('home', {
        title: 'Hello',
    });
});

module.exports = router;
