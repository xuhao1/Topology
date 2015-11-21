# Topology
## Usager
Open app/\*.html
And open cross-origin in Chrome

## build :
Windows:

    browserify.cmd  -t [ babelify --presets [ es2015 ] ] .\src\engine_core.js > build\bundle.js

Unix :

    browserify  -t [ babelify --presets [ es2015 ] ] ./src/engine_core.js > build/bundle.js
    
