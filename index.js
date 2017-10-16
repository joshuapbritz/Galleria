var express = require('express');
var exphbs = require('express-handlebars');
var cors = require('express-cors');

var app = express();

//Set up the view engine with handlebars
app.engine('handlebars', exphbs({ defaultLayout: 'layout' }));
app.set('view engine', 'handlebars');

//Set up a static folder for assets [eg. CSS, JS, IMAGES, etc]
app.use(express.static('public'));

//Allow CORS
app.use(
    cors({
        allowedOrigins: ['*'],
    })
);

app.get('/', function(req, res) {
    res.render('home', {
        title: 'Hello',
    });
});

app.get('/about', (req, res) => {
    res.render('about', {
        title: 'about',
    });
});

app.get('/contact', (req, res) => {
    res.render('home', {
        title: 'contact',
    });
});

app.get('/shop', (req, res) => {
    res.render('home', {
        title: 'shop',
    });
});

var port = process.env.PORT || 4500;
app.listen(port, () => {
    console.log('Process started at http://localhost:' + port);
});
