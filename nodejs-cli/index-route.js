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
  .name('route')

program
  .option('--config <file>', 'a config file to use. defaults to using ./accessapi-config.json', 'accessapi-config.json')
  .option('-i,--instance', 'instance (required if multiple instances defined in the config file)')
  //.option('--recursive','route', false)
  .arguments("<assetPath> [workflowStatus]")
  .action(function (assetPath, workflowStatus) {
    program.assetPath = assetPath;
    program.workflowStatus = workflowStatus;
  })

program
  .parse(process.argv)

function getSystemState(accessapi, workflowStatusName) { 
  var deferred = Q.defer();

  if(program.workflowStatus) {
    getSystemStates(accessapi).done((states) => {

      var workflowState = states.find((i) => { 
        return program.workflowStatus.toUpperCase() == i.stateName.toUpperCase(); 
      });

      if(workflowState !== undefined) {
          deferred.resolve(workflowState);
      } else {
          deferred.reject(new Error("could not find a state named '%s' in the system.", program.workflowStatus)); 
      }

    });
  }

  return deferred.promise;
}

function getSystemStates(accessapi) {
    var deferred = Q.defer();

    log.debug('getSystemStates');
    accessapi.AssetExists("/System/States").done((resp2)=>{
        var resp = resp2.json;
        
        if(resp.exists !== true) {
            log.error('failed to get list on /System/States');
            deferred.reject(new Error('/System/States not found.'));
        }

        accessapi.AssetPaged({"assetId":resp.assetId}).done((resp2)=>{
            var resp = resp2.json;

            var states = resp.assets.reduce((accumulator,value) => {
                if(value.type === 2) {//only push assets (type=2)
                    accumulator.push({"stateName":value.label, "stateId":value.id});
                }
                return accumulator;
            }, []);

            deferred.resolve(states);
        });

    });

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

        getSystemState(accessapi, program.workflowStatus).done((workflowState) => {

            accessapi.AssetExists(program.assetPath).done((resp2)=>{
              var resp = resp2.getBody();
              
              if(resp.exists !== true) {
                fail("asset '%s' was not found.", program.assetPath);
                process.exit(1);
              }

              log.debug('assetroute');
              accessapi.AssetRoute({"assetId":resp.assetId, "stateId":workflowState.stateId}).then((resp2)=> {
                status("succeeded routing '%s' to status '%s'", program.assetPath, program.workflowStatus);
              });

            });

        })

    });

}();
