'use strict';

var Utils = require("./TopoUtils.js");
var ratio = Utils.ratio;
var EarthRadius = Utils.EarthRadius;

var readerloader = require("./datareader");
//var THREE = require("three.js")
var dataloader = function (reader_type, url_gen, datatype, dataproccess) {

    var reader = readerloader(reader_type);
    if (reader === undefined) {
        return;
    }
    this.reader = new reader(url_gen, datatype, dataproccess);
};

dataloader.prototype.constructor = dataloader;

dataloader.prototype.load_data = function (param, onLoad) {
    this.reader.read_async(param, onLoad);
};

dataloader.prototype.load_data_list = function (list, onLoadList) {
    this.reader.read_list (list, onLoadList);
};

var maptileloader = function () {
    var loader = new dataloader("naive", function (param) {
            return `https://a.tiles.mapbox.com/v3/examples.map-qfyrx5r8/${param.zoom}/${param.x}/${param.y}.png`;
        }, "arraybuffer", function (param,data) {
            console.log(param);
            var msg = new Blob([data]);
            console.log(msg);
            var img = document.createElement('img');
            img.src = URL.createObjectURL(msg);
            var texture = new THREE.Texture();
            texture.image = img;
            texture.needsUpdate = true;
            return texture;
        }
    );
    return loader;
};

// Memory when loading height of texture
var heightmaploader = function () {
    var size = 6;
    var loader = new dataloader("network", function (param) {
        console.log(`http://gdem.yfgao.com/${param.x}/${param.y}/${param.zoom}/${size}`);
        return `http://gdem.yfgao.com/${param.x}/${param.y}/${param.zoom}/${size}`;
    }, "arraybuffer", function (param,arrayBuffer) {
        var w = Math.pow(2, size) + 1;
        var data = new Float32Array(w * w);
        try {
            var byteArray = new Int16Array(arrayBuffer);
            if (byteArray.length != 0) {
                for (var i = 0; i < w; i++) {
                    for (var j = 0; j < w; j++) {
                        data[(i * w + j)] = byteArray[(i * w + j)] * ratio;//byteArray[w-i+(w-j)*w];
                    }
                }
            }
            else {
            }
        }
        catch (e) {
            console.log(`wrong at ${param.x} ${param.y} ${param.zoom}`);
        }
        var Texture = new THREE.DataTexture(data, w, w,
            THREE.AlphaFormat, THREE.FloatType);
        Texture.needsUpdate = true;
        return Texture;
    });
    return loader;
};
module.exports = {
    map: maptileloader,
    height: heightmaploader
};
