#!/usr/bin/env node

var program = require('commander');
var prompt = require('prompt');
var fs = require('fs');
var chalk = require('chalk');

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

getUpdateGram = function (program, encoding, cb) {
  
  
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
      cb(parsedData);
    });

  }

  else //read from file
  {
    //read file name from program.args[2]
    fs.readFile(program.inputFile, { 'encoding': encoding }, function (data) {
      cb(data);
    });
  }
		
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
  accessapi.auth(function (data) {
    
    console.log('calling AssetExists args1=\'%s\'.', program.args[1]);
    accessapi.AssetExists(program.args[1], function (data) {
      console.log('assetexists data returned', data);
    });
    
    getUpdateGram(program, function (body) {
      
      console.log('body', body)

      //accessapi.AssetUpdate()

    });

  });

}();
