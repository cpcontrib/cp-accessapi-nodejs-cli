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
  .option('--rawJson', 'output as raw json')
  .option('-f,--formatter', 'use a specific formatter.  valid options are [rawjson|dosdir|default]')
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

function pad(pad, str, padLeft) {
  if (typeof str === 'undefined') 
    return pad;
  if (padLeft) {
    return (pad + str).slice(-pad.length);
  } else {
    return (str + pad).substring(0, pad.length);
  }
}

function formatDosDir(program,assets,console) {
  console.log(util.format(' Directory of %s', program.assetPath));
  console.log('');
              
  for(var i=0; i < assets.length; i++) {
    var asset = assets[i];
    
    var directoryOrSizeStr = null;
    if(asset.type === 4) {
      directoryOrSizeStr = '<DIR>         ';
    } else if(asset.type === 2) {
      directoryOrSizeStr = pad('             ', asset.size,true);
    }
    
    
    var formattedDateStr = asset.modified_date.toString();
    formattedDateStr = pad('                        ', formattedDateStr);
    
    console.log('%s  %s %s`%d`', formattedDateStr, directoryOrSizeStr, asset.label, asset.id);
  }
}
function formatRawJson(program,assets,console) {
  console.log(JSON.stringify(assets,null,'  '));
}
function formatCrownpeakList(program,assets,console) {
  console.log(util.format(' Directory of %s', program.assetPath));
  console.log('');
              
  for(var i=0; i < assets.length; i++) {
    var asset = assets[i];
    
    var directoryOrSizeStr = null;
    if(asset.type === 4) {
      directoryOrSizeStr = '<DIR>         ';
    } else if(asset.type === 2) {
      directoryOrSizeStr = pad('             ', asset.size,true);
    }
    
    
    var formattedDateStr = asset.modified_date.toString();
    formattedDateStr = pad('                        ', formattedDateStr);
    
    console.log('%s  %s %s (%d) [%s]', formattedDateStr, directoryOrSizeStr, asset.label, asset.id, asset.statusName);
  }
}

function getFormatter(program) {
  var formatter = null;

  if(program["rawjson"] === true) {
    formatter = formatRawJson;
  
  if(program["formatter"] !== undefined)
    
    if(program["formatter"] === 'default') { program["formatter"] = "formatCrownpeakList"; }

    formatter = global[program.formatter];
    if(formatter === undefined) {
      formatter = global['format' + program.formatter];
    }
    if(formatter === undefined) {
      fail("a formatter named '%s' or 'format%s' was not found.");
      process.exit(1);
    }
  } else {
    //
    formatter = formatCrownpeakList;
  }

  return formatter;
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
        
        if(resp.exists !== true) {
            fail("folder '%s' was not found.", program.assetPath);
            process.exit(1);
        }

        accessapi.AssetPaged({"assetId":resp.assetId}).then((resp2)=>{
            var resp = resp2.json;
            var formatter = getFormatter(program);

            if(formatter !== undefined) {
              formatter(program, resp.assets, console);
            }

        });

    });

  });

}();
