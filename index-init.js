#!/usr/bin/env node

var program = require('commander');
var prompt = require('prompt');
var fs = require('fs');

program
  .parse(process.argv)
  
console.log('Initialize a cp-config.json');
console.log();
console.log('Note that the CrownPeak AccessAPI requires the use of an API Key.  Contact CrownPeak support at support@crownpeak.com to request a key.');
console.log();
console.log();

var currentValues = {};
if(fs.existsSync('accessapi-config.json')) {
  
  try {
    currentValues = JSON.parse(fs.readFileSync('accessapi-config.json', { encoding:"utf8" }));
  } 
  catch(e) {
  }
}

//https://github.com/flatiron/prompt#valid-property-settings
var properties = [
  { 
    name: 'cms-instance-name'
    ,default: currentValues["cms-instance-name"]
    ,message: 'Name of the CrownPeak instance'
  }
  ,{
    name: 'apikey'
    ,message: 'The API key to access the instance with'
    ,default: currentValues.apikey
  }
  ,{
    name: 'username'
    ,message: '(optional) Username to use to access'
    ,default: currentValues.username
  }
  ,{
    name: 'password'
    ,hidden: true
    ,replace: '*'
    ,message: '(optional) Password to use to access'
    ,default: currentValues.password
    ,ask: function() {
      //only ask if the username was entered.
      return prompt.history('username').value > 0;
    }
  }
];

prompt.start();

prompt.get(properties, function(err,result) {
  if(err) { return onErr(err); }
  
  result["cms-instance-url"] = "https://cms.crownpeak.net/" + result["cms-instance-name"];
  
  console.log('result', result);

  fs.writeFileSync('./accessapi-config.json', JSON.stringify(result,null,2), 'utf-8');
  console.log('Wrote answers to accessapi-config.json');

});

function onErr(err) {
  console.log(err);
  return 1;
}