'use strict';

var Utils = require("./TopoUtils.js");
var long2tile = Utils.long2tile;
var lat2tile = Utils.lat2tile;
var title2lat = Utils.title2lat;
var title2long = Utils.title2long;
var ratio = Utils.ratio;
var EarthRadius = Utils.EarthRadius;
var tileID = Utils.tileID;


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
        useheight : {type : 'i' , value : 0},
        ratio: {type: "t", value: ratio}
    };
    if (heightmap != 0) {
        uniforms.heightmap = {type: "t", value: heightmap};
        uniforms.useheight = {type : 'i' , value : 1};
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

function Map2tile(param, map_texture, height_texture) {
    var x = param.x;
    var y = param.y;
    var zoom = param.zoom;
    var _LonStart = title2long(x, zoom);
    var _LonEnd = title2long(x + 1, zoom);
    var _LatStart = title2lat(y, zoom);
    var _LatEnd = title2lat(y + 1, zoom);
    if (height_texture != 0)
        return SphereTitleWithHeight(_LatStart, _LatEnd, _LonStart, _LonEnd
            ,32,32, height_texture, true, map_texture);
    else
        return SphereTitleWithHeight(_LatStart, _LatEnd, _LonStart, _LonEnd
            , 16, 16, height_texture, true, map_texture);

}

var dataloader = require("./maploader.js");

var tilemanager = function (global_scene, piece_scene) {
    this.maploader = dataloader.map();
    this.heightloader = dataloader.height();
    this.global_scene = global_scene;
    this.enable_height = 9;
    this.global_map_set = {};
    this.loading = false;
    this.loadstack = [[]];
    this.unloadstack = [[]];
};

tilemanager.prototype.constructor = tilemanager;


//Loading tile list and put them into global scene
tilemanager.prototype.load_global_tile_list = function (param_list, onLoadList) {
    this.loading = true;
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
                        obj.loadstack[obj.loadstack.length - 1].push({mesh:mesh,param:param_map});
                        obj.global_map_set[tileID(param_map)] = mesh;
                        num ++;

                        if (num == map_list.length) {
                            console.log("Finish loading with height");
                            obj.loading = false;
                            onLoadList(res);
                        }
                    });
                }
                else {
                    var mesh = res[tileID(param_map)] = Map2tile(param_map, map_value , 0);
                    obj.loadstack[obj.loadstack.length - 1].push({mesh:mesh,param:param_map});
                    obj.global_map_set[tileID(param_map)] = mesh;
                    num++;
                    if (num == map_list.length) {
                        console.log("Finish loading without height");
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
    let obj = this;
    this.load_global_tile_list(params, function (list) {
        for (var i in list) {
            var tile = list[i];
            obj.global_scene.add(tile);
        }
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
        if (tileID(tmp_param) in this.global_map_set) {
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
    if (param_list.length == 0 )
        return;
    k.tile.material.wireframe = true;
    k.tile.material.needsUpdate = true;
    this.load_global_tile_list(param_list, function (data) {
        obj.global_scene.remove(k.tile);
        obj.unloadstack[obj.unloadstack.length - 1].push({mesh:k.tile,param:k.param});
        delete obj.global_map_set[tileID(k.param)];
        for (var i in data)
        {
            var tile = data[i];
            obj.global_scene.add(tile);
        }
    });
};
tilemanager.prototype.zoomin = function (param) {
    this.loadstack.push([]);
    this.unloadstack.push([]);
};


tilemanager.prototype.zoomout = function (param) {
    console.log(this.loadstack);
    console.log(this.unloadstack);
    if (this.loadstack.length < 3)
        return;
    var unstacktop = this.unloadstack.pop();
    var lostacktop = this.loadstack.pop();
    if (unstacktop.length > 0) {
        while (lostacktop.length > 0)
        {
            console.log("delete new");
            var p = lostacktop.pop();
            this.global_scene.remove(p.mesh);
            delete this.global_map_set[tileID(p.param)];
        }
        while (unstacktop.length > 0) {
            console.log("add old");
            var p = unstacktop.pop();
            this.global_scene.add(p.mesh);
            p.mesh.material.wireframe = false;
            p.mesh.needsUpdate = true;
            this.global_map_set[tileID(p.param)] = p.mesh;
        }
    }
};

module.exports = tilemanager;
