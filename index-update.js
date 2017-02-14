#!/usr/bin/env node

var program = require('commander');
var prompt = require('prompt');
var fs = require('fs');
var util = require('util');
var chalk = require('chalk');
var Q = require('q');
var log4js = require('log4js');

var log = log4js.getLogger();

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
  .name('update')

program
  .option('--config <file>', 'a config file to use', 'accessapi-config.json')
  .option('-i,--instance', 'instance (required if multiple instances in accessapi-config.json)')
  .option('--stdin', 'read input from stdin')
  .option('--as', 'set type of asset to be one of: developercs (updates body field) or binary (updates binary data). others defined later. this option used with file input or --stdin')
  .option('--field <field>', 'update using a specific field name, use when updating from a file or stdin without json')
  .option('-pi,--runPostInput','run post input plugin for the asset\'s template')
  .option('-ps,--runPostSave', 'run post save')
  .arguments("<assetPath> [inputFile]")
  .action(function (assetPath, inputFile) {
    program.assetPath = assetPath;
    program.inputFile = inputFile;
  })

program
  .parse(process.argv)

log.debug('program.config',program.config);
log.debug('program.assetPath',program.assetPath);

function getContent (program, encoding) {
  if (log.isDebugEnabled) log.debug('begin reading content');
  var deferred = Q.defer();

  if (program.stdin) {
    log.debug('reading content from stdin');
  
    var stdin = process.stdin;
    var stdout = process.stdout;
    
    var inputChunks = [];
    
    stdin.on('data', function (data) {
      if (log.isDebugEnabled) log.debug('chunk:',data);
      if (Buffer.isBuffer(data)) data = data.toString('utf8');
      inputChunks.push(data);
    });
    
    stdin.on('end', function () {
      var contentStr = (inputChunks.length == 1 ? inputChunks[0] : inputChunks.join(""));
      
      try {
        var parsedData = JSON.parse(contentStr);
        deferred.resolve(parsedData);
        return;
      }
      catch(ex) { }
      
      if (program.field !== undefined) {
        parsedData = {};
        parsedData[program.field] = contentStr;
        deferred.resolve(parsedData);
      }
      
    });

  }

  else //read from file
  {
    //read file name from program.args[2]
    log.debug('reading from file=%s', program.inputFile);
    return Q.nfcall(fs.readFile, program.inputFile, { 'encoding': encoding });
  }
  
  return deferred.promise;
}

main = function () {
  if (typeof program.assetPath === 'undefined') {
    fail('no assetPath specified.');
    program.help();
    process.exit(1);
  }
  
  log.debug('Loading config from %s.', program.config);
  if (fs.existsSync(program.config)==false) {
    fail('Failed to load config from %s: file doesn\'t exist.', program.config);
    process.exit(1); 
  }

  //var reader = require('./accessapi-json-config-reader');
  var accessapiConfig = JSON.parse(fs.readFileSync(program.config));
  
  log.debug('accessapiConfig:', accessapiConfig);

  status(`Instance: ${accessapiConfig.instance}   Sign in as: ${accessapiConfig.username}`);
  status(`Updating: ${program.assetPath}`);
  
  var accessapi = require('crownpeak-accessapi');
  accessapi.setConfig(accessapiConfig);
  
  status('');
  status('Authenticating.');
  accessapi.auth().then(function (data) {
    
    var assetIdOrPath = program.assetPath;

    log.debug('calling AssetExists');
    accessapi.AssetExists(assetIdOrPath).then(function (existsResp) {
      
      //existsResp documented http://developer.crownpeak.com/Documentation/AccessAPI/AssetController/Methods/Exists(AssetExistsRequest).html
      var workflowAssetId = existsResp.json.assetId;
      
      getContent(program).then(function (fieldsJson) {
        
        log.debug('calling AssetUpdate');
        accessapi.AssetUpdate(workflowAssetId, fieldsJson, null, /*runPostInput*/false, /*runPostSave*/true).then(function() {
          status('Success updating %s.', program.assetPath);
        })

      });

    });

  }, function(err) {
    fail('Authentication failure: %s', err.resultCode);
  }).catch(function (err) {
    error("error occurred:", err);
  }).done();

}();
