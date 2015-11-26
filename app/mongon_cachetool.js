var mongoose = require('mongoose');
var http = require('http');
var url = require('url');
var XMLHttpRequest = require('xhr2');
var fs =require('fs');

var httpdatacacher = function (url_gen) {
    var obj = this;
    this.open_db = false;
    this.url_gen = url_gen;
    mongoose.connect('mongodb://localhost/');
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function (callback) {
        console.log("Successful open mongodb");
        obj.open_db = true;
    });
    this.db = db;
    this.schema = new mongoose.Schema({
        url: String,
        data: Buffer
    });
    this.model = mongoose.model('Datacache', this.schema);
};

httpdatacacher.prototype.query_http = function (param, onLoad) {
    /*
    var oReq = new XMLHttpRequest();
    var url = this.url_gen(param);
    oReq.open("GET", url, true);
    oReq.responseType = "blob";
    var obj = this;
    oReq.onload = function (evt) {
        var data = oReq.response;
        console.log(`x :${param.x} y:${param.y} zoom:${param.zoom}  ${data.length}`);
        onLoad(data);
    };
    oReq.send(null);
    */
    var options = url.parse(this.url_gen(param));
    var obj = this;
    var req = http.request(options, function(res) {
        res.setEncoding('binary'); // this

        var data = [];
        res.on('data', function(chunk) {
            return data += chunk;
        });
        res.on('end', function() {
            console.log(obj.url_gen(param));
            console.log(`x :${param.x} y:${param.y} zoom:${param.zoom}  ${data.length}`);
            data = new Buffer(data, "binary");
            console.log(`x :${param.x} y:${param.y} zoom:${param.zoom}  ${data.length}`);
            return onLoad(data);
        });
        res.on('error', function(err) {
            console.log("Error during HTTP request");
            console.log(err.message);
        });
    });
    req.end();
};

httpdatacacher.prototype.query = function (param, onLoad) {
    var obj = this;
    var url = this.url_gen(param);
    //console.log(`query db ${url}`);
    this.model.findOne({'url': url}, function (err, data) {
        if (err)
            return handleError(err);
        if (data == null) {
            obj.query_http(param, function (data) {
                var inst = new obj.model({
                    url: obj.url_gen(param),
                    data: data
                });
                inst.save(function (err) {
                    if (err) // ...
                        console.log(err);
                });
                obj.query(param,onLoad);
            });
        }
        else {
            onLoad(data.data.buffer);
        }

    });
};
function rawtoBuffer(ab) {
    var buffer = new Buffer(ab.length);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = ab[i];
    }
    return buffer;
}
function toBuffer(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

// tests

var map_cacher = function ()
{
    var res = new httpdatacacher(function (param) {
        return `http://a.tiles.mapbox.com/v3/examples.map-qfyrx5r8/${param.zoom}/${param.x}/${param.y}.png`;
    });
    return res;
};
var height_cacher = function()
{
    var res = new httpdatacacher(function (param) {
        return `http://gdem.yfgao.com/${param.x}/${param.y}/${param.zoom}/${size}`;
    });
    return res;
};

module.exports = {
    map_cacher : map_cacher,
    height_cacher : height_cacher
};
