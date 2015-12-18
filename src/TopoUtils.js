'use strict';

function XYZ2LatLon(xyz) {
    xyz = xyz.normalize();
    var x = xyz.x;
    var y = xyz.y;

    var lat = Math.asin(xyz.z);
    var lon = Math.asin(xyz.y / Math.cos(lat));
    if (x < 0 && y > 0) {
        lon = Math.PI - lon;
    }
    else if (x < 0 && y < 0) {
        lon = -Math.PI - lon;
    }

    return {
        lat: lat * 180.0 / Math.PI,
        lon: lon * 180.0 / Math.PI
    };
}
function long2tile(lon, zoom) {
    return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
}
function lat2tile(lat, zoom) {
    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
}
function title2long(x, zoom) {
    var n = Math.pow(2, zoom);
    return x / n * 360.0 - 180.0;
}
function title2lat(y, zoom) {
    var n = Math.pow(2, zoom);
    var lat_rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    return lat_rad * 180.0 / Math.PI;
}
function latlon2param(ll, zoom) {
    return {
        x: long2tile(ll.lon, zoom),
        y: lat2tile(ll.lat, zoom),
        zoom: zoom
    };
}
var urlgen = {
    map: {
        server: function(param) {
            return `http://a.tiles.mapbox.com/v3/examples.map-qfyrx5r8/${param.zoom}/${param.x}/${param.y}.png`;
        },
        local: function(param) {
            return `http://localhost:4707/map.png?&zoom=${param.zoom}&x=${param.x}&y=${param.y}`;
        }
    },
    height: {
        server: function(param) {
            return `http://gdem.yfgao.com/${param.x}/${param.y}/${param.zoom}/6`;
        },
        local: function(param) {
            return `http://localhost:4707/height/?x=${param.x}&y=${param.y}&z=${param.zoom}&zoom=6`;
        }
    }
};
function tileID(param) {
    var x = param.x;
    var y = param.y;
    var zoom = param.zoom;
    return `${x},${y},${zoom}`;
}
module.exports = {
    XYZ2LatLon: XYZ2LatLon,
    long2tile: long2tile,
    lat2tile: lat2tile,
    title2lat: title2lat,
    title2long: title2long,
    latlon2param: latlon2param,
    EarthRadius: 6371000,
    ratio: 1.0 / 10000,
    min_cam_height: 200,
    max_cam_height: 6371000,
    max_zoom: 17,
    tileID: tileID,
    urlgen:urlgen
};