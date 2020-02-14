const log = require('log-to-file')

module.exports = class Logger{

    log(...args){
        console.log(args);
        log(args);
    }

    warn(...args){
        console.warn(args);
        log('WARN: ' + args)
    }

    error(...args){
        console.error(args);
        log('ERROR: ' + args)
    }

}