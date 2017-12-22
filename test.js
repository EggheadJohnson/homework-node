'use strict'

const test = require('tape')
const series = require('run-series')
const fs = require('fs')
const folderSize = require('get-folder-size')
const download = require('./')

test('download', function (t) {
  t.plan(15)

  const COUNT = parseInt(process.env.COUNT, 10) || 10

  series([
    (callback) => download(COUNT, callback),
    verifyCount,
    verifySize,
    verifyLodash,
    verifyErrorOnMissingCallback,
    verifyErrorOnNonNumberOrMissingCount,
    testCleanOutFiles,
    testCleanOutFolders,
    testDownloadPackage,
    testUnpack,
    testFetchNames
  ], t.end)

  function verifyCount (callback) {
    fs.readdir('./packages', function (err, files) {
      if (err) return callback(err)
      // Filter .gitignore and other hidden files
      files = files.filter((file) => !/^\./.test(file))
      t.equal(files.length, COUNT, `has ${COUNT} files`)
      callback()
    })
  }

  function verifySize (callback) {
    folderSize('./packages', function (err, size) {
      if (err) return callback(err)
      t.ok(size / 1024 > 5 * COUNT, 'min 5k per package')
      callback()
    })
  }

  function verifyLodash (callback) {
    const _ = require('./packages/lodash/package')
    t.equal(typeof _.map, 'function', '_.map exists')
    callback()
  }

  function verifyErrorOnMissingCallback (callback) {
    t.throws(download.bind(this, 5), 'download throws on missing callback');
    callback();
  }

  function verifyErrorOnNonNumberOrMissingCount (callback) {
    t.throws(download.bind(this, 'a'), 'download throws on nonnumeric count');
    t.throws(download.bind(this), 'download throws on missing count');
    callback();
  }

  function testCleanOutFiles (callback) {
    const cleanOutPackages = require('./utils').cleanOutPackages;
    fs.writeFile(`${__dirname}/packages/testFile.txt`, "A message", (err) => {
      fs.readdir(`${__dirname}/packages`, (err, files) => {
        t.notEqual(files.indexOf('testFile.txt'), -1, 'testFile.txt created');
        cleanOutPackages(f => f === 'testFile.txt', (err) => {
          fs.readdir(`${__dirname}/packages`, (err, files) => {
            t.equal(files.indexOf('testFile.txt'), -1, 'testFile.txt removed');
            callback();
          })
        })
      })

    })
  }
  function testCleanOutFolders (callback) {
    const cleanOutPackages = require('./utils').cleanOutPackages;
    fs.mkdir(`${__dirname}/packages/testFolder`, (err) => {
      fs.readdir(`${__dirname}/packages`, (err, files) => {
        t.notEqual(files.indexOf('testFolder'), -1, 'testFolder created');
        cleanOutPackages(f => f === 'testFolder', (err) => {
          fs.readdir(`${__dirname}/packages`, (err, files) => {
            t.equal(files.indexOf('testFolder'), -1, 'testFolder removed');
            callback();
          })
        })
      })

    })
  }

  function testDownloadPackage (callback) {
    const downloadPackage = require('./utils').downloadPackage;
    const cleanOutPackages = require('./utils').cleanOutPackages;
    // bootstrap because it is a big enough package but is pretty far down on the list
    downloadPackage('bootstrap', (err, response) => {
      t.error(err);
      t.deepEqual(response, { name: 'bootstrap', fileName: 'bootstrap-3.3.7.tgz' }, 'bootstrap downloaded');
      // cleanup after myself
      cleanOutPackages(f => f === 'bootstrap-3.3.7.tgz', callback);
    })
  }

  function testUnpack (callback) {
    const unpack = require('./utils').unpack;
    const downloadPackage = require('./utils').downloadPackage;
    const cleanOutPackages = require('./utils').cleanOutPackages;

    downloadPackage('bootstrap', (err, response) => {
      unpack(`${__dirname}/packages/${response.fileName}`, (err) => {
        fs.readdir(`${__dirname}/packages`, (err, files) => {
          t.notEqual(files.indexOf('bootstrap-3.3.7.tgz'), 'bootstrap downloaded');
          t.notEqual(files.indexOf('bootstrap'), 'bootstrap unpacked');
          cleanOutPackages(f => /^bootstrap/.test(f), callback);
        })
      })
    })
  }

  function testFetchNames (callback) {
    const fetchNames = require('./utils').fetchNames;

    fetchNames(COUNT, (err, allNames) => {
      t.equal(allNames.length, COUNT, "Correct number of names fetched");
      callback();
    })
  }

})
