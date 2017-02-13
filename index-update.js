#!/usr/bin/env node

var program = require('commander');
var prompt = require('prompt');
var fs = require('fs');
var chalk = require('chalk');
var Q = require('q');

var constants = {
  configJsonName: "accessapi-config.json"
};

program
  .name('update')

program
  .option('-i,--instance', 'instance (required if multiple instances in accessapi-config.json)')
  .option('--stdin', 'read input from stdin')
  .option('--as', 'set type of asset to be one of: developercs (updates body field) or binary (updates binary data). others defined later. this option used with file input or --stdin')
  .option('--field', 'force updating specific field name')
  .option('-pi,--runPostInput','run post input plugin for the asset\'s template')
  .option('-ps,--runPostSave', 'run post save')
  .arguments("<assetPath> [inputFile]")
  .action(function (assetPath, inputFile) {
    program.assetPath = assetPath;
    program.inputFile = inputFile;
  })

program
  .parse(process.argv)

console.log('program.config=%s', program.config);
console.log('program.assetPath=%s', program.assetPath);
getUpdateGram = function (program, encoding) {
  console.log('getUpdateGram'.green);
  var deferred = Q.defer();

  if (program.stdin) {
    var stdin = process.stdin;
    var stdout = process.stdout;
    
    var inputChunks = [];
    
    stdin.on('data', function (data) {
      inputChunks.push(data);
    });
    
    stdin.on('end', function () {
      var inputJSON = (inputChunks.length == 1 ? inputChunks[0] : inputChunks.join(""));
      var parsedData = JSON.parse(inputJSON);
      deferred.resolve(parsedData);
    });

  }

  else //read from file
  {
    //read file name from program.args[2]
    return Q.nfcall(fs.readFile, program.inputFile, { 'encoding': encoding });
  }
  
  return deferred.promise;
}

main = function () {
  if (typeof program.assetPath === 'undefined') {
    program.help();
    process.exit(1);
  }
  
  
  console.log('read %s', program.config);
  
  //var reader = require('./accessapi-json-config-reader');
  var accessapiConfig = JSON.parse(fs.readFileSync('./accessapi-config.json'));
  
  console.log('read config', accessapiConfig);
  
  var accessapi = require('crownpeak-accessapi');
  accessapi.setConfig(accessapiConfig);
  
  console.log('calling auth');
  accessapi.auth().then(function (data) {
    
    var assetIdOrPath = program.assetPath;

    accessapi.AssetExists(assetIdOrPath).then(function (existsResp) {
      
      //existsResp documented http://developer.crownpeak.com/Documentation/AccessAPI/AssetController/Methods/Exists(AssetExistsRequest).html
      var workflowAssetId = existsResp.json.assetId;
      
      getUpdateGram(program).then(function (fieldsJson) {
        
        accessapi.AssetUpdate(workflowAssetId, fieldsJson, null, /*runPostInput*/false, /*runPostSave*/true);

      });

    });

  }).catch(function (err) {
    console.log("error occurred:", err);
  })

}();
