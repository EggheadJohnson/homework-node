'use strict'

const async = require('async');
const utils = require('./utils');
const debug = require('debug')('index');

module.exports = downloadPackages;

function downloadPackages (count, callback) {
  utils.cleanOutPackages((err) => {
    if (err) return callback(err);
    utils.fetchNames(count, (err, names) => {
      if (err) return callback(err);
      debug({err, names});

      async.map(names, utils.downloadPackage, (err, files) => {
        if (err) return callback(err);
        debug({err, files});
        async.each(files, utils.unpack, (err) => {
          if (err) return callback(err);
          utils.cleanOutPackages((file) => /tgz$/.test(file), callback);
        })
      })

    })
  })
}
