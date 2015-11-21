# Topology
## Usage
Open app/\*.html

## build :
Windows:

    browserify.cmd  -t [ babelify --presets [ es2015 ] ] .\src\engine_core.js > build\bundle.js

Unix :

    browserify  -t [ babelify --presets [ es2015 ] ] ./src/engine_core.js > build/bundle.js
    
