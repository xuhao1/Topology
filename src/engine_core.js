'use strict';
var tilemanger;
var Utils;
var $;

try {
    tilemanger = require("./TileManager.js");
    Utils = require("./TopoUtils.js");
    window.$ = window.jQuery = require('../static/js/jquery-1.11.3.min.js');
}
catch(e) {
    tilemanger = require("../src/TileManager.js");
    Utils = require("../src/TopoUtils.js");
    window.$ = window.jQuery = require('../static/js/jquery-1.11.3.min.js');
}

var long2tile = Utils.long2tile;
var lat2tile = Utils.lat2tile;
var title2lat = Utils.title2lat;
var title2long = Utils.title2long;
var XYZ2LatLon = Utils.XYZ2LatLon;
var ratio = Utils.ratio;
var EarthRadius = Utils.EarthRadius;
var max_cam_height = Utils.max_cam_height;
var min_cam_height = Utils.min_cam_height;
var max_zoom = Utils.max_zoom;

//Height should switch 30000 m
class CameraController {
    constructor(camera, engine) {
        this.theta = -Math.PI / 2.0;
        this.phi = 0;
        this.camera = camera;
        //this.camera.position.x = 0;
        this.camera.far = ratio * EarthRadius * 10;
        this.height = EarthRadius * 2;
        this.wx = 0;
        this.wy = 0;
        this.raycaster = new THREE.Raycaster();
        this.engine = engine;
        this.lookatz = 0;
    }

    update() {
        this.theta += this.wx;
        this.phi += this.wy;
        if (this.phi > 85 /180 *Math.PI)
        {
            this.phi = 85 /180 *Math.PI;
        }
        if (this.phi <  - 85 /180 *Math.PI)
        {
            this.phi = - 85 /180 *Math.PI;
        }
        var rad = (EarthRadius + this.height) * ratio;
        this.camera.position.x = rad * Math.cos(this.theta) * Math.cos(this.phi);
        this.camera.position.y = rad * Math.sin(this.theta) * Math.cos(this.phi);
        this.camera.position.z = rad * Math.sin(this.phi);
        this.camera.up.x = 0;
        this.camera.up.y = 0;
        this.camera.up.z = 1;
        this.wx = this.wx * 0.93;
        this.wy = this.wy * 0.93;
        this.camera.lookAt(new THREE.Vector3(0, 0, this.lookatz));

    }

    needUpdateMap() {
        /*
         var camera = this.camera;
         this.raycaster.setFromCamera(new THREE.Vector2(-1,-1),camera);
         var intersects = this.raycaster.intersectObjects( engine.scenecp.children );
         */
    }

    zoom(k) {
        this.height = this.height * (1 + 0.1 * k);
        //console.log(this.height);
        if (this.height < min_cam_height) {
            this.height = min_cam_height;
        }
        if (this.height > max_cam_height) {
            this.height = max_cam_height;
        }
        this.needUpdateMap();
    }

    leftright(k) {
        this.wx += 0.2 * k * this.height / EarthRadius / 10;
        this.needUpdateMap();
    }

    updown(k) {
        this.wy += 0.2 * k * this.height / EarthRadius / 10;
        this.needUpdateMap();
    }

    getMouseLatLon(x, y) {
        var camera = this.camera;
        var _x = x / this.engine.w * 2 - 1;
        var _y = -( y / this.engine.h * 2 - 1);
        this.raycaster.setFromCamera(new THREE.Vector2(_x, _y), camera);
        var intersects = this.raycaster.intersectObjects(this.engine.scene.children);
        if (intersects.length == 0)
            return null;
        var ll = XYZ2LatLon(intersects[0].point);
        ll.distance = intersects[0].distance;
        return ll;
    }

    looksky() {
        this.lookatz = EarthRadius * ratio;
    }

    lookback() {
        this.lookatz = 0;
    }

    autozoom(x, y) {
        var ll = this.getMouseLatLon(x, y);
        var DeltaTheta = (1.0 / this.engine.w) * 40 / 180 * Math.PI;
        var PictureWidth = DeltaTheta * ll.distance * 256;
        var DividePieces = Math.cos(ll.lat / 180 * Math.PI) * 2 * Math.PI
            * EarthRadius * ratio / PictureWidth;
        var Size = Math.floor(Math.log2(DividePieces)) ;
        if (Size > max_zoom)
            return max_zoom;
        return Size;
    }
    debugimg() {
        var d = this.engine.getMouseTile();
        console.log(d);
        if (d!=null)
        {
            var src = d.tile.material.uniforms.texture1.value.image.currentSrc
            document.getElementById("debugimg").setAttribute("src",src);
        }
    }

}

function GenText(word, x, y, z) {
    var textgeox = new THREE.TextGeometry(word, {
        size: 10,
        height: 2
    });

    var material = new THREE.MeshBasicMaterial({color: 0xff0000});
    var TextMesh = new THREE.Mesh(textgeox, material);
    TextMesh.position.x = x;
    TextMesh.position.y = y;
    TextMesh.position.z = z;
    return TextMesh;
}

class DJIMapEngine {
    constructor(container, w, h) {
        this.camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 10000);
        this.controller = new CameraController(this.camera, this);
        let scene = this.scene = new THREE.Scene();
        this.tm = new tilemanger(scene, 0);
        let renderer = this.renderer = new THREE.WebGLRenderer();
        renderer.setClearColor(0xbfd1e5);
        //renderer.setClearColor(0x000000);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(w, h);
        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        let stats = this.stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        container.appendChild(stats.domElement);

        this.w = w;
        this.h = h;
        this.mouseX = 0;
        this.mouseY = 0;

        this.tm.load_global_area(-85, 85, -180, 180, 3);

        var axiscale = 1000;
        var axisHelper = new THREE.AxisHelper(axiscale);
        scene.add(axisHelper);
        scene.add(axisHelper);
        var size = 1000;
        var step = 10;


        scene.add(GenText("London x", axiscale, 0, 0));
        scene.add(GenText("US y", 0, axiscale, 0));
        scene.add(GenText("North z", 0, 0, axiscale));

        this.autozoom();
    }

    static animate(engine) {
        requestAnimationFrame(function () {
            DJIMapEngine.animate(engine)
        });
        engine.render();
        engine.stats.update();
        //console.log("animate");
    }


    onWindowResize(event) {

    }


    render() {
        if (this.mouseX > 2000 || this.mouseX < 0) {
            this.mouseX = this.mouseX % 2000;
        }
        if (this.mouseY > 2000 || this.mouseY < 0) {
            this.mouseY = this.mouseY % 2000;
        }
        let mouseX = this.mouseX;
        let mouseY = this.mouseY;
        this.controller.update();
        this.renderer.render(this.scene, this.camera);

        var d = new Date();
        if (this.tm.loading)
        {
            document.getElementById("status").innerHTML = (`loading height : ${this.controller.height}`);
        }
        else {
            document.getElementById("status").innerHTML = ( `loaded  height : ${this.controller.height}`);
        }

    }

    autozoom() {
        var obj = this;
        setInterval(function () {
            //console.log(obj.tm.loading);
            if (obj.tm.loading)
                return;
            var ll = obj.controller.getMouseLatLon(obj.w / 2, obj.h / 2);
            if (ll != null) {
                var param = Utils.latlon2param(ll,
                    obj.controller.autozoom(obj.w / 2, obj.h / 2));
                obj.tm.find_replace_cover(param);
            }
        }, 100);

    }
    getMouseLatLon() {
        //console.log({x:this.mouseX,y:this.mouseY});
        return this.controller.getMouseLatLon(this.mouseX,this.mouseY);
    }
    getMouseTile() {
        var ll = this.getMouseLatLon();
        if (ll!=null) {
            var param = {
                zoom : 20,
                y: Utils.lat2tile(ll.lat,20),
                x: Utils.long2tile(ll.lon,20)
            };
            return this.tm.find_mini_cover(param);
        }
        return null;
    }

}


window.DJIMapEngine = DJIMapEngine;

