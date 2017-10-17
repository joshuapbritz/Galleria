var db = require('diskdb');
var fs = require('fs');

db = db.connect('./DB', ['galleries']);

exports.paginate = function(data, page, numberPerPage) {
    // data = order(data);
    page = Number(page);
    var length = numberPerPage;
    var index = page - 1;
    var offset = index * length;
    var amount = offset + length;

    var totalPages = Math.ceil(data.length / length);
    var object = {
        files: data.slice(offset, amount),
        hasNext: page < totalPages,
        hasLast: page > 1,
        nextPage: page + 1,
        lastPage: page - 1,
    };
    return object;
};

// var image_checker = setInterval(function() {
//     var data = db.galleries.find();
//     data.forEach(el => {
//         var path = __dirname + '/public/user_images/';
//         el.files.forEach(item => {
//             if () {
                
//             }
//         });
//     });
// }, 1000 * 60);

var doCheck = function() {
    var path = __dirname + '/public/user_images';
    var items = fs.readdirSync(path);
    console.log(items);
}

function order(data) {
    var sorted;
    sorted = data.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return sorted.reverse();
}
