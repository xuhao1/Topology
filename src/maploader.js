'use strict';

var Utils = require("./TopoUtils.js");
var ratio = Utils.ratio;
var EarthRadius = Utils.EarthRadius;

var reader = require("./datareader");
//var THREE = require("three.js")

var dataloader = function (datatype, dataproccess) {
    this.reader = new reader.naive(datatype, dataproccess);
};

dataloader.prototype.constructor = dataloader;

dataloader.prototype.load_data = function (param, onLoad) {
    this.reader.read_async(param, onLoad);
};

dataloader.prototype.load_data_list = function (list, onLoadList) {
    this.reader.read_list (list, onLoadList);
};

var maptileloader = function () {
    var loader = new dataloader(
        "map", function (param,data) {
            var msg = new Blob([data]);
            var img = document.createElement('img');
            img.src = URL.createObjectURL(msg);
            var texture = new THREE.Texture();
            texture.image = img;
            texture.needsUpdate = true;
            console.log(param);
            console.log(msg);
            console.log(img.src);
            return texture;
        }
    );
    return loader;
};

// Memory when loading height of texture
var heightmaploader = function () {
    var size = 6;
    var loader = new dataloader("height", function (param,arrayBuffer) {
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
