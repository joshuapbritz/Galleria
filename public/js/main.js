document.querySelector('.navigation-btn').addEventListener('click', function() {
    this.classList.toggle('open');
    document.querySelector('.navigation').classList.toggle('open');
});

// function addFiles(input, evt) {
//     var img = /^([a-zA-Z0-9\s_\\.\-:])+(.jpg|.jpeg|.gif|.png|.bmp)$/;
//     if (input.files && input.files[0]) {
//         var files = evt.target.files;

//         for (var i = 0; i < files.length; i++) {
//             var file = files[i];
//             var reader = new FileReader();
//             reader.onload = function(e) {
//                 var src = e.target;
//                 document.getElementById('images').innerHTML +=
//                     '<img class="preview-image" src="' + src.result + '">';
//             };
//             reader.readAsDataURL(file);
//         }
//     }
// }
