'use strict'

const async = require('async');
const utils = require('./utils');
const debug = require('debug')('index');

module.exports = downloadPackages;

/*
 * downloadPackages takes a series of steps:
 * - Clean out packages folder to remove any existing, potentially unwanted files/folderSize
 * - Obtain the names of the top {count} of depended upon packages from npm
 * - Download the tarball from npm
 * - Unpack the tarball
 * - Clean up the tarball, leaving the unpacked folder behind
 * @param {number} count required, must be a number
 * @param {function} callback required, must be a function, executes at the end of above series
 *
*/
function downloadPackages (count, callback) {
  debug("HERE");
  if (!count || typeof count !== 'number' || count < 1) throw new Error("Count must be a number greater than or equal to 1");
  if (!callback || typeof callback !== 'function') throw new Error("Callback must be a function");
  utils.cleanOutPackages((err) => {
    if (err) return callback(err);
    utils.fetchNames(count, (err, names) => {
      if (err) return callback(err);
      debug({err, names});

      async.map(names, utils.downloadPackage, (err, npmPackages) => {
        if (err) return callback(err);
        debug({err, npmPackages});
        async.each(npmPackages, utils.unpack, (err) => {
          if (err) return callback(err);
          utils.cleanOutPackages((file) => /tgz$/.test(file), callback);
        })
      })

    })
  })
}
