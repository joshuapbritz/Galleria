var multer = require('multer');

var JsonFormatConfig = {
    type: 'space',
    size: 2,
};

var GetDevEnv = function() {
    return true;
};

var getUrl = function() {
    var env = GetDevEnv();
    if (env) {
        return 'http://localhost:4500/user_images/';
    } else {
        return 'https://galleryapi.herokuapp.com/user_images/';
    }
};

var getBase = function() {
    var env = GetDevEnv();
    if (env) {
        return 'http://localhost:4500/';
    } else {
        return 'https://galleryapi.herokuapp.com/';
    }
};

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/user_images');
    },
    filename: function(req, file, cb) {
        cb(null, 'user_image_' + Date.now() + '.jpeg');
    },
});

// exports.diskStorage = storage;

module.exports = {
    diskStorage: storage,
    devEnv: GetDevEnv(),
    FormatConfig: JsonFormatConfig,
    exportUrl: getUrl(),
    relativeBase: '/user_images/',
    baseUrl: getBase(),
};
