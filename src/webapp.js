var dataloader  = require("./maploader.js");
var loader = dataloader.map();
console.log(loader);
loader.load_data({x:3,y:6,zoom:4},function(msg){
    console.log(msg);
});

var data_list = [
    {x:3,y:6,zoom:4},
    {x:4,y:2,zoom:4},
    {x:3,y:5,zoom:4}
];
loader.load_data_list(data_list,function(list) {
    for (var k of list )
    {
        console.log(k);
    }
});
var heightloader = dataloader.height();

data_list = [
    {x:24,y:48,zoom:7},
    {x:32,y:16,zoom:7},
    {x:24,y:40,zoom:7}
];
heightloader.load_data_list(data_list,function(list) {
    for (var k of list )
    {
        console.log(k);
    }
});