'use strict';

const async = require('async');
const request = require('request');
const childProcess = require('child_process');
const targz = require('targz');
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

function cleanOutPackages(filter, cb) {
  if (!cb) {
    cb = filter;
    filter = () => true;
  }
  fs.readdir(`${__dirname}/../packages`, (err, files) => {
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

function downloadPackage(name, cb) {
  childProcess.exec(`cd ${__dirname}/../packages && npm pack ${name}`, (err, stdOut, stdErr) => {
    if (err) return cb(err);

    // From what I've seen stdErr is just a warning that some package is deprecated and should not scuttle the whole process
    if (stdErr) console.error(stdErr);

    let response = {
      name: name,
      fileName: stdOut.trim()
    }
    debug({err, stdOut, stdErr, response});


    cb(null, response);
  })
}

function fetchNames(count, cb) {
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

function getOffsets(count) {
  let maxPage = Math.floor(count/36);
  let offsets = [];
  for (let x = 0; x <= maxPage; x++) {
    offsets.push(x*36);
  }
  return offsets;
}

function unpack(file, cb) {

  fs.mkdir(`${__dirname}/../packages/${file.name}`, (err) => {
    tar.x({
      strip: 1,
      cwd: `${__dirname}/../packages/${file.name}`,
      file: `${__dirname}/../packages/${file.fileName}`
    },
    (err) => {
      return cb(err);
    })
  })

}
