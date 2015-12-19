'use strict';
var cacher = require("./mongon_cachetool.js");
let map_cacher = cacher.map_cacher();
let height_cacher = cacher.height_cacher();

var express = require('express');
var app = express();

app.get('/', function (req, res) {
    res.send('Hello World!');
});
app.get('/map.*',function(req,res){
    var param = {
        x:req.query.x,
        y:req.query.y,
        zoom:req.query.zoom
    };
    map_cacher.query(
        param, function(data) {
            console.log(data);
            res.send(data);
        }
    );
});
app.get('/height/',function(req,res){
    var param = {
        x:req.query.x,
        y:req.query.y,
        zoom:req.query.zoom,
        size:6
    };
    height_cacher.query(
        param, function(data) {
            console.log(data);
            res.send(data);
        }
    );
});

var server = app.listen(4707, function () {
    var host = server.address().address;
    var port = server.address().port;
});

