var mongoose = "";
try {
    mongoose = require('mongoose');
}
catch (e) {
    console.log("No mongoose found,use fs cacher");
}
var http = require('http');
var url = require('url');
var XMLHttpRequest = require('xhr2');
var fs = require('fs');

var schema = new mongoose.Schema({
    url: String,
    data: Buffer
});

var model = mongoose.model('Datacache', schema);

var datacacher = function (url_gen, datatype) {
    this.datatype = datatype;
    this.url_gen = url_gen;
};

datacacher.prototype.query_http = function (param, onLoad) {
    var options = url.parse(this.url_gen(param));
    var obj = this;
    var req = http.request(options, function (res) {
        res.setEncoding('binary'); // this

        var data = [];
        res.on('data', function (chunk) {
            return data += chunk;
        });
        res.on('end', function () {
            data = new Buffer(data, "binary");
            return onLoad(data);
        });
        res.on('error', function (err) {
            console.log("Error during HTTP request");
            console.log(err.message);
        });
    });
    req.end();
};

var mongondatacacher = function (url_gen, datatype) {
    this.datatype = datatype;
    this.url_gen = url_gen;

    var obj = this;
    this.open_db = false;
    mongoose.connect('mongodb://localhost/');
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function (callback) {
        console.log("Successful open mongodb");
        obj.open_db = true;
    });
    this.db = db;

};

mongondatacacher.prototype = Object.create(datacacher.prototype);

mongondatacacher.prototype.query = function (param, onLoad) {
    var obj = this;
    var url = this.url_gen(param);
    model.findOne({'url': url}, function (err, data) {
        if (err)
            return handleError(err);
        if (data == null) {
            obj.query_http(param, function (data) {
                var inst = new model({
                    url: obj.url_gen(param),
                    data: data
                });
                inst.save(function (err) {
                    if (err) // ...
                        console.log(err);
                });
                obj.query(param, onLoad);
            });
        }
        else {
            //if (obj.datatype == "map")
            //    fs.writeFileSync(`data/imgs/${param.zoom}-${param.x}-${param.y}.png`,data.data);
            onLoad(data.data);
        }

    });
};

var fsdatacacher = function (url_gen, datatype) {
    this.datatype = datatype;
    this.url_gen = url_gen;
    if (!fs.existsSync('data/'))
        fs.mkdir("data/");
    if (!fs.existsSync(`data/${datatype}`))
        fs.mkdir(`data/${datatype}`);
};

fsdatacacher.prototype = Object.create(datacacher.prototype);

fsdatacacher.prototype.query = function (param, onLoad) {
    var obj = this;
    var url = this.url_gen(param);
    var str = 0;
    var path = `data/${this.datatype}/${param.zoom}-${param.x}-${param.y}`;
    if (this.datatype == "map")
        path += '.png';
    if (this.datatype == "height")
        path +=  `-${param.size}.height`;
    if (fs.existsSync(path)) {
        console.log(`reading ${path}`);
        var str = fs.readFileSync(path);
        console.log(str);
        onLoad(str);
    }
    else {
        console.log("Query from internet");
        obj.query_http(param, function (data) {
            fs.writeFileSync(path, data);
            obj.query(param, onLoad);
        });
    }
};
var map_cacher = function () {
    var res = new fsdatacacher(function (param) {
        console.log(`http://a.tiles.mapbox.com/v3/examples.map-qfyrx5r8/${param.zoom}/${param.x}/${param.y}.png`);
        return `http://a.tiles.mapbox.com/v3/examples.map-qfyrx5r8/${param.zoom}/${param.x}/${param.y}.png`;
    }, "map");
    return res;
};
var height_cacher = function () {
    var size = 6;
    var res = new fsdatacacher(function (param) {
        console.log(`http://gdem.yfgao.com/${param.x}/${param.y}/${param.zoom}/${size}`);
        return `http://gdem.yfgao.com/${param.x}/${param.y}/${param.zoom}/${size}`;
    }, "height");
    return res;
};

module.exports = {
    map_cacher: map_cacher,
    height_cacher: height_cacher
};
