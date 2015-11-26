'use strict';
var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var cacher = require("./mongon_cachetool.js");

app.listen(8081);
function handler(req, res) {
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }

            res.writeHead(200);
            res.end(data);
        });
}

let map_cacher = cacher.map_cacher();
let height_cacher = cacher.height_cacher();


io.on('connection', function (socket) {
    socket.on('map_request', function (arg) {
        map_cacher.query(arg.param, function (data) {
            io.emit('map_reply', {
                param: arg.param,
                data: data
            });
        });
    });
    socket.on('height_request', function (arg) {
        height_cacher.query(arg.param, function (data) {
            io.emit('height_reply', {
                param: arg.param,
                data: data
            });
        });
    });
});
/*
 map_cacher.query_http({x:4,y:8,zoom:4}, function (data) {

 });
 */