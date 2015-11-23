'use strict';

var Utils = require("./TopoUtils.js");
var long2tile = Utils.long2tile;
var lat2tile = Utils.lat2tile;
var title2lat = Utils.title2lat;
var title2long = Utils.title2long;
var ratio = Utils.ratio;
var EarthRadius = Utils.EarthRadius;

function tileID(param) {
    var x = param.x;
    var y = param.y;
    var zoom = param.zoom;
    return `${x},${y},${zoom}`;
}
function SphereTitleWithHeight(LatStart, LatEnd, LonStart, LonEnd, ws, hs, heightmap, degree, texturemap) {
    if (degree) {
        LatStart = LatStart * Math.PI / 180.0;
        LonStart = LonStart * Math.PI / 180.0;
        LatEnd = LatEnd * Math.PI / 180.0;
        LonEnd = LonEnd * Math.PI / 180.0;
    }

    LatStart = -LatStart;
    LatEnd = -LatEnd;

    LatStart += Math.PI / 2;
    LatEnd += Math.PI / 2;

    var geometry = new THREE.SphereGeometry(EarthRadius * ratio, ws, hs, LonStart, LonEnd - LonStart,
        LatStart, LatEnd - LatStart);

    var uniforms = {
        texture1: {type: "t", value: texturemap},
        ratio: {type: "t", value: ratio}
    };
    if (heightmap != 0) {
        uniforms.heightmap = {type: "t", value: heightmap};
    }
    var ShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: document.getElementById("vertexshader").textContent,
        fragmentShader: document.getElementById("fragmentshader").textContent,
        wireframe: false,
        shading: THREE.SmoothShading,
        uniforms: uniforms
    });
    var sphere = new THREE.Mesh(geometry, ShaderMaterial);
    sphere.rotateX(Math.PI / 2);
    sphere.rotateY(Math.PI);

    return sphere;
}

function Map2tile(param, map_texture, height_texture = 0) {
    var x = param.x;
    var y = param.y;
    var zoom = param.zoom;
    var _LonStart = title2long(x, zoom);
    var _LonEnd = title2long(x + 1, zoom);
    var _LatStart = title2lat(y, zoom);
    var _LatEnd = title2lat(y + 1, zoom);
    if (height_texture != 0)
        return SphereTitleWithHeight(_LatStart, _LatEnd, _LonStart, _LonEnd
            , 32, 32, height_texture, true, map_texture);
    else
        return SphereTitleWithHeight(_LatStart, _LatEnd, _LonStart, _LonEnd
            , 16, 16, height_texture, true, map_texture);

}

var dataloader = require("./maploader.js");

var tilemanager = function (global_scene, piece_scene) {
    this.maploader = dataloader.map();
    this.heightloader = dataloader.height();
    this.global_scene = global_scene;
    this.piece_scene = piece_scene;
    this.enable_height = 9;
    this.global_map_set = {};
    this.cached_map_set = {};
    this.loading = false;
};

tilemanager.prototype.constructor = tilemanager;


//Loading tile list and put them into global scene
tilemanager.prototype.load_global_tile_list = function (param_list, onLoadList) {
    this.loading = true;
    console.log(param_list);
    let obj = this;
    var res = {};
    this.maploader.load_data_list(
        param_list,
        function (map_list) {
            let num = 0;
            for (let iter of map_list) {
                let param_map = iter.param;
                let map_value = iter.data;
                if (param_map.zoom >= obj.enable_height) {
                    obj.heightloader.load_data(iter.param, function (height_texture) {
                        var mesh = res[tileID(param_map)] = Map2tile(param_map, map_value, height_texture);
                        //console.log(obj.global_scene);
                        //console.log(mesh);
                        obj.global_scene.add(mesh);
                        obj.cached_map_set[tileID(param_map)] = mesh;
                        obj.global_map_set[tileID(param_map)] = mesh;
                        num ++;

                        if (num == map_list.length) {
                            obj.loading = false;
                            onLoadList(res);
                        }
                        //mesh.material.wireframe = true;
                        //mesh.material.needsUpdate = true;
                    });
                }
                else {
                    var mesh = res[tileID(param_map)] = Map2tile(param_map, map_value);
                    obj.global_scene.add(mesh);
                    obj.cached_map_set[tileID(param_map)] = mesh;
                    obj.global_map_set[tileID(param_map)] = mesh;
                    num++;
                    if (num == map_list.length) {
                        obj.loading = false;
                        onLoadList(res);
                    }
                }
            }
        }
    );
};

tilemanager.prototype.load_global_area = function (LatStart, LatEnd, LonStart, LonEnd, zoom) {
    var ys = lat2tile(LatStart, zoom);
    var ye = lat2tile(LatEnd, zoom);
    var xs = long2tile(LonStart, zoom);
    var xe = long2tile(LonEnd, zoom);

    if (ys > ye) {
        var temp = ys;
        ys = ye;
        ye = temp;
    }

    var params = [];
    for (var x = xs; x < xe; x++) {
        for (var y = ys; y < ye; y++) {
            params.push({
                x: x,
                y: y,
                zoom: zoom
            });
        }
    }
    this.load_global_tile_list(params, function (list) {
        console.log("loaded...");
    });
};

/*
 Tibet : 8 197 106
 HK 11 1673 893
 */

tilemanager.prototype.find_mini_cover = function (param) {
    if (param.zoom < 3)
        return null;
    for (var zoom = param.zoom; zoom >= 3; zoom--) {
        var tmp_param = {
            x: Math.floor(param.x / Math.pow(2, param.zoom - zoom)),
            y: Math.floor(param.y / Math.pow(2, param.zoom - zoom)),
            zoom: zoom
        };
        // console.log(tileID(tmp_param));
        if (tileID(tmp_param) in this.global_map_set) {
            //console.log("find cover!!!");
            //console.log(tmp_param);
            var tile = this.global_map_set[tileID(tmp_param)];
            //tile.material.wireframe = true;
            //tile.material.needsUpdate = true;
            return {
                param: tmp_param,
                tile: tile
            };
        }
    }
    return null;
};
tilemanager.prototype.gen_replace_list = function (param_tar, param_ori) {
    var param_list = [];
    for (var zoom = param_ori.zoom + 1; zoom <= param_tar.zoom; zoom++) {
        var rate = Math.pow(2, param_tar.zoom - zoom);
        var x = Math.floor(param_tar.x / rate);
        var y = Math.floor(param_tar.y / rate);
        var dx = -1, dy = -1;
        if (x % 2 == 0)
            dx = 1;
        if (y % 2 == 0)
            dy = 1;
        param_list.push({
            x: x + dx,
            y: y,
            zoom: zoom
        });
        param_list.push({
            x: x + dx,
            y: y + dy,
            zoom: zoom
        });
        param_list.push({
            x: x,
            y: y + dy,
            zoom: zoom
        });
    }
    param_list.push({
        x: param_tar.x,
        y: param_tar.y,
        zoom: param_tar.zoom
    });
    return param_list;

};
tilemanager.prototype.find_replace_cover = function (param) {
    let k = this.find_mini_cover(param);
    var obj = this;

    if (k == null)
        return 0;
    if (k.param.zoom >= param.zoom)
        return;
    var param_list = this.gen_replace_list(param, k.param);
    this.load_global_tile_list(param_list, function (data) {
        obj.global_scene.remove(k.tile);
        //console.log(obj.global_map_set);
        //obj.global_map_set.remove(tileID(param));
    });
};


module.exports = tilemanager;