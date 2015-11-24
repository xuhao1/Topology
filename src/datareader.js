'use strict';

var inNode = false;
if (typeof XMLHttpRequest == "undefined") {
    XMLHttpRequest = require('xhr2');
    inNode = true;
}

var datareader = function (url_gen, datatype, dataprocess) {
    this.url_gen = url_gen;
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


module.exports = function (name) {
    var dict = {
        "network": networkreader
    };
    return dict[name];
};