var dataloader  = require("./src/maploader.js");
var loader = dataloader();
console.log(loader);
loader.load_data({x:3,y:6,zoom:4},function(msg){
    //console.log(msg);
});