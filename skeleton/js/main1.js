//=============================================================================
// main.js
//=============================================================================
PluginManager.loadScript = function(name) {

};
PluginManager.setup($plugins);

OLD_DataManager_loadDataFile = DataManager.loadDataFile;
DataManager.loadDataFile = function(name, src, data=false) {
    if(data){
        window[name] = DataManager.DecompressedData[src];
        DataManager.onLoad(window[name]);
        DataManager.DecompressedData[src] = null;
    }
    else{
        OLD_DataManager_loadDataFile(name,src);
    }
};
DataManager.loadDatabase = function() {
    var test = this.isBattleTest() || this.isEventTest();
    var prefix = test ? 'Test_' : '';
    var xhr = new XMLHttpRequest();
    var url = './dist/bundle2.js';
    xhr.open('GET', url);
    xhr.overrideMimeType('application/json');
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
        const compressed = new Uint8Array(xhr.response);
        const originalArray = compressed.map(v => (v - 18) % 256);
        const decompressed = pako.inflate(originalArray, { to: 'string' });
        DataManager.DecompressedData = JSON.parse(decompressed);
        for (var i = 0; i < DataManager._databaseFiles.length; i++) {
            var name = DataManager._databaseFiles[i].name;
            var src = DataManager._databaseFiles[i].src;
            DataManager.loadDataFile(name, prefix + src,true);
        }
    };
    xhr.onerror = this._mapLoader || function() {
        DataManager._errorUrl = DataManager._errorUrl || url;
    };
    xhr.send();

    if (this.isEventTest()) {
        this.loadDataFile('$testEvent', prefix + 'Event.json');
    }
};