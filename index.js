'use strict'

const async = require('async');
const utils = require('./utils');
// const cheerio = require('cheerio');
// const request = require('request');
const debug = require('debug')('index');
// const childProcess = require('child_process');
// const targz = require('targz');
// const fs = require('fs');
// const rimraf = require('rimraf');

module.exports = downloadPackages;

function downloadPackages (count, callback) {

  utils.cleanOutPackages((err) => {
    utils.fetchNames(count, (err, names) => {
      debug({err, names});

      async.map(names, utils.downloadPackage, (err, files) => {
        debug({err, files});
        files.forEach(utils.unpack);
      })

    })
  })



}
