var home = require('./routes/home.routes');
var accounts = require('./routes/accounts.routes');
var gallery = require('./routes/gallery.routes');
var api = require('./routes/api.routes');

module.exports = {
    home: home,
    accounts: accounts,
    gallery: gallery,
    api: api,
};
