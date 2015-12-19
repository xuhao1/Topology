'use strict';
var Utils = require("./TopoUtils.js");
var io = require("../static/js/socket.io.js");
var tileID = Utils.tileID;

var inNode = false;
if (typeof XMLHttpRequest == "undefined") {
    XMLHttpRequest = require('xhr2');
    inNode = true;
}

var datareader = function ( datatype, dataprocess) {
    this.datatype = datatype;
    this.dataprocess = dataprocess;
};

datareader.prototype.constructor = datareader;

datareader.prototype.read_list = function (_list, onDataList) {
    var obj = [];
    for (var i = 0; i < _list.length; i++) {
        let s = _list[i];
        this.read_async(_list[i], function (Data) {
            obj.push(
                {
                    param: s,
                    data: Data
                }
            );
            if (obj.length == _list.length) {
                //console.log(obj);
                onDataList(obj);
            }
        });
    }
};

var networkreader = function (url_gen, datatype, dataprocess) {
    this.url_gen = url_gen;
    this.datatype = datatype;
    this.dataprocess = dataprocess;
};

networkreader.prototype = Object.create(datareader.prototype);

networkreader.prototype.read_async = function (param, onData) {
    var oReq = new XMLHttpRequest();
    var url = this.url_gen(param);
    oReq.open("GET", url, true);
    oReq.responseType = this.datatype;
    var obj = this;
    oReq.onload = function (evt) {
        var data = oReq.response;
        onData(obj.dataprocess(param,data));
    };
    oReq.send(null);
};

var nativereader = function (datatype, dataprocess) {
    this.datatype = datatype;
    this.dataprocess = dataprocess;
    this.pending_list = {};
    let obj = this;
    this.socket = io('http://localhost:8081');
    this.socket.on(`${datatype}_reply`,function(data)
    {
        obj.pending_list[tileID(data.param)](obj.dataprocess
        (data.param,data.data));
    });
};

nativereader.prototype = Object.create(datareader.prototype);

nativereader.prototype.read_async = function(param,onData) {
    this.pending_list[tileID(param)] = onData;
    console.log("requesting...");
    this.socket.emit(`${this.datatype}_request`,
        {
            param:param
        });
};

module.exports = {
        network: networkreader,
        naive : nativereader
};