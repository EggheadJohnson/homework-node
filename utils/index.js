'use strict';

const async = require('async');
const request = require('request');
const childProcess = require('child_process');
const tar = require('tar');
const fs = require('fs');
const cheerio = require('cheerio');
const rimraf = require('rimraf');
const debug = require('debug')('utils');

const NPM_URL = 'https://www.npmjs.com';

module.exports = {
  cleanOutPackages: cleanOutPackages,
  downloadPackage: downloadPackage,
  fetchNames: fetchNames,
  unpack: unpack
}

/*
 * @function cleanOutPackages - cleans up the packages folder to ensure that:
 * - no unsightly tgz files remain after unpacking
 * - excess packages from previous installs are removed
 * @param {function} filter - optional, provide to ensure only files you want removed are removed, e.g. /tgz$/.test(fileName) === true
 * @param {function} cb - required is passed any error encountered
 */

function cleanOutPackages(filter, cb) {
  // If neither filter nor cb exists
  if (!filter) throw new Error("cb is required");
  // If the cb does not exist, use the default filter
  if (!cb) {
    cb = filter;
    filter = () => true;
  }
  fs.readdir(`${__dirname}/../packages`, (err, files) => {
    if (err) return cb(err);
    files = files.filter(f => f !== '.' && f !== '..' && f !== '.gitignore');
    files = files.filter(filter);
    debug(files);
    async.each(files, (file, cb) => {

      fs.stat(`${__dirname}/../packages/${file}`, (err, stats) => {
        if (err) return cb(err);
        if (stats.isDirectory()){
          debug(`${__dirname}/../packages/${file}`, "is a directory!");
          rimraf(`${__dirname}/../packages/${file}`, cb);
        }
        else if (stats.isFile()){
          debug(`${__dirname}/../packages/${file}`, "is a file!");
          fs.unlink(`${__dirname}/../packages/${file}`, cb);
        }
      })
    }, (err) => {
      cb(err);
    })
  })
}

/*
 * @function downloadPackage - downloads a specific package from npm using npm pack:
 * @param {string} name - the package name to be downloaded
 * @param {function} cb - required is passed any error encountered as well as the package name and filename as part of the response object
 */

function downloadPackage(name, cb) {
  if (!name || !cb) throw new Error("Package name and callback are both required");
  childProcess.exec(`cd ${__dirname}/../packages && npm pack ${name}`, (err, stdOut, stdErr) => {
    if (err) return cb(err);
    // From what I've seen stdErr in this application tends to be a warning that some package is deprecated and should not scuttle the whole process
    if (stdErr) console.error(stdErr);
    let response = {
      name: name,
      fileName: stdOut.trim()
    }
    debug({err, stdOut, stdErr, response});
    cb(null, response);
  })
}

/*
 * @function fetchNames - obtain the top {count} most depended upon package names from npm
 * @param {number} count - required, the number of packages to return
 * @param {function} cb - required is passed any error encountered as well as the top {count} package names
 */

function fetchNames(count, cb) {
  if (!count || !cb) throw new Error("Count and callback are both required");
  let offsets = getOffsets(count);
  debug(offsets);
  let allNames = [];
  async.each(offsets, (offset, cb) => {
    request({
      url: NPM_URL+'/browse/depended',
      qs: {
        offset: offset
      }
    }, (err, data, html) => {
      if (err) return cb(err);
      const $ = cheerio.load(html)
      let names = $(".name").map(function(i, elem) {
        return $(this).text();
      }).get();
      allNames = allNames.concat(names);
      cb();
    });
  }, (err) => {
    if (err) return cb(err);
    allNames = allNames.slice(0, count);
    debug(allNames, allNames.length);
    cb(null, allNames);
  })
}

/*
 * @function getOffsets - a helper function to return any offset needed in finding file names for download
 * @param {number} count - the number of packages to be downloaded, defaults to 0
 * @return {array[numbers]} offsets - a list of the offsets to be used
 */

function getOffsets(count) {
  // Setting a default of 0 here will still set this program up to return the first 36 results
  count = count || 0;
  let maxPage = Math.floor(count/36);
  let offsets = [];
  for (let x = 0; x <= maxPage; x++) {
    offsets.push(x*36);
  }
  return offsets;
}

/*
 * @function unpack - extracts the file referenced by npmPackage.fileName to the location referenced by npmPackage.name
 * @param {Object} npmPackage - required, two required fields:
 * - {string} fileName: the name of the tgz file to be extracted
 * - {string} name: the name of the location where it will be extracted
 * @param {function} cb - required, called after extract is completed with any errors encountered
 */

function unpack(npmPackage, cb) {
  if (!npmPackage || !npmPackage.name || !npmPackage.fileName || !cb) throw new Error("File and callback required");

  fs.mkdir(`${__dirname}/../packages/${npmPackage.name}`, (err) => {
    tar.x({
      strip: 1,
      cwd: `${__dirname}/../packages/${npmPackage.name}`,
      file: `${__dirname}/../packages/${npmPackage.fileName}`
    },
    (err) => {
      return cb(err);
    })
  })

}
