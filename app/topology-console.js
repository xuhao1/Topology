const ipcMain = require('electron').ipcMain;
ipcMain.on('height_map_request', function(event, arg) {
    console.log(arg);  // prints "ping"
});