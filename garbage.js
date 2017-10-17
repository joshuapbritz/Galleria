var db = require('diskdb');
var fs = require('fs');

db = db.connect('./DB', ['galleries']);

var doCheck = function() {
    // All items in the user images folder;
    var path = __dirname + '/public/user_images';
    var stored_images = fs.readdirSync(path);

    // Container for items that shouldn't exsist;
    var for_bin = [];

    // All user galleries;
    var data = db.galleries.find();
    var galleryImages = [];

    // Flatten the hierarchy of the images
    data.forEach(el => {
        el.filesRelative.forEach(item => {
            galleryImages.push(item);
        });
    });

    // Find images that should be in the bin
    for_bin = stored_images.filter((item, i) => {
        var exsists = galleryImages.includes(item);
        if (!exsists) {
            return item;
        }
    });

    // Delete the items that shouldn't exsist

    for_bin.forEach(item => {
        fs.unlinkSync(path + '/' + item);
    });
    var date = new Date();
    console.log(
        '[' +
            date.toDateString() +
            ' @ ' +
            date.getHours() +
            ':' +
            date.getMinutes() +
            ']' +
            ' Garbage collection completed\n' +
            for_bin.length +
            ' files deleted'
    );
};

var gc = function() {
    setInterval(doCheck, 1800000);
};

exports.run = gc;
exports.runNow = doCheck;
