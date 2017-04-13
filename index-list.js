#!/usr/bin/env node

var program = require('commander');
var prompt = require('prompt');
var fs = require('fs');
var util = require('util');
var chalk = require('chalk');
var Q = require('q');
var log4js = require('log4js');

var log = log4js.getLogger();

process.on('exit', () => { process.exit(0); })

if (fs.existsSync('./log4js.json')) {
  log4js.configure('./log4js.json');
} else if(process.env["LOG4JS_CONFIG"] !== undefined) {

} else {
  log4js.configure({
    appenders: [
      { 
        type: 'console' , 
        level: 'INFO', 
        layout: { type:"pattern", pattern: " %[%m%]" } 
      },
    ]
  })
  log.setLevel('INFO');
}

var constants = {
  configJsonName: "accessapi-config.json"
};

function status(text) {
  var argsArray = Array.prototype.slice.call(arguments);
  log.info.apply(log, argsArray);
  if (log.isInfoEnabled==false) {
    var str = util.format.apply(null,argsArray);
    process.stdout.write(str);
    process.stdout.write('\n');
  }
}
function fail(text) {
  var argsArray = Array.prototype.slice.call(arguments);
  log.fatal.apply(log, argsArray);
  if (log.isFatalEnabled==false) {
    var str = util.format.apply(null,argsArray);
    process.stderr.write(str);
    process.stderr.write('\n');
  }
}

program
  .name('list')

program
  .option('--config <file>', 'a config file to use. defaults to using ./accessapi-config.json', 'accessapi-config.json')
  .option('-i,--instance', 'instance (required if multiple instances defined in the config file)')
  //.option('--recursive','route', false)
  .arguments("<assetPath>")
  .action(function (assetPath) {
    program.assetPath = assetPath;
  })

program
  .parse(process.argv)

function getSystemStates(accessapi) {
    var deferred = Q.defer();

    log.debug('getSystemStates');
    

    return deferred.promise;
}

main = function() {

    status("Routing '%s' to status '%s'.", program.assetPath, program.workflowStatus);    

    var accessapi = require('crownpeak-accessapi');

    var loadConfigOpts = {};
    loadConfigOpts.file = program.config;
    loadConfigOpts.instance = program.instance;
    accessapi.loadConfig(loadConfigOpts);

    log.debug('auth');
    accessapi.auth().done(()=>{

      accessapi.AssetExists(program.assetPath).then((resp2)=>{
        var resp = resp2.json;
        
        if(resp.exists !== "true") {
            fail("folder '%s' was not found.", program.assetPath);
        }

        accessapi.AssetPaged({"assetId":resp.assetId}).then((resp2)=>{
            var resp = resp2.json;
            
            console.log(JSON.stringify(resp,null,'  '));

        });

    });

  });

}();
