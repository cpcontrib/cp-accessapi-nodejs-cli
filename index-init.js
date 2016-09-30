#!/usr/bin/env node

var program = require('commander');
var prompt = require('prompt');

program
  .parse(process.argv)
  
console.log('Initialize a cp-config.json');

prompt.start();

prompt.get(['apikey','username','password'], function(err,result) {
  if(err) { return onErr(err); }
  
  console.log("prompt result",result);

});

function onErr(err) {
  console.log(err);
  return 1;
}