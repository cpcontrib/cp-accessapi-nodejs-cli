#!/usr/bin/env node

var program = require('commander');
var prompt = require('prompt');

program
  .parse(process.argv)
  
console.log('Initialize a cp-config.json');
console.log('Note that the CrownPeak AccessAPI requires the use of an API Key.  Contact CrownPeak support at support@crownpeak.com to request a key.');

//https://github.com/flatiron/prompt#valid-property-settings
var properties = [
  { 
    name: 'cms-instance-name',
    message: 'Name of the CrownPeak instance'
  }
  ,{
    name: 'apikey',
    message: 'The API key to access the instance with'
  }
  ,{
    name: 'username'
    ,message: '(optional) Username to use to access'
    
  }
  ,{
    name: 'password'
    ,hidden: true
    ,replace: '*'
    ,message: '(optional) Password to use to access'
  }
];

prompt.start();

prompt.get(properties, function(err,result) {
  if(err) { return onErr(err); }
  
  result["cms-instance-url"] = "https://cms.crownpeak.net/" + result["cms-instance-name"];
  
  console.log('result', result);

});

function onErr(err) {
  console.log(err);
  return 1;
}