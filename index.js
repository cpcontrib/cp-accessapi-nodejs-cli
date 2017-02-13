#!/usr/bin/env node

var program = require('commander');

program
  .version('0.1.0')
  .command('init', 'initialize a config for using the AccessAPI')
  .command('update', 'update an asset')
  .parse(process.argv);