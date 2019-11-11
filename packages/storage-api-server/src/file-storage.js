const fs = require('fs')
const mv = require('mv')
const mkdirp = require('mkdirp')
const crypto = require('crypto')
const path = require('path')

const { STORAGE_PATH } = process.env

module.exports = {
  meta (filePath, cb) {
    return fs.stat(filePath, cb)
  },
  createReadStream (filePath) {
    return fs.createReadStream(filePath)
  },
  writeFile (filePath, data, cb) {
    return fs.writeFile(filePath, data, cb)
  },
  mkdirp (filePath, cb) {
    return mkdirp(filePath, cb)
  },
  mv (source, destination, cb) {
    return mv(source, destination, cb)
  },
  shardKey (key) {
    const delimiter = '/'
    const shards = [[0, 9, 14], [0, 9, 20], [0, 9, 15]]
    return path.join(
      STORAGE_PATH,
      shards.reduce((sum, positions) => {
        return `${sum}${positions.reduce(
          (part, x) => `${part}${key[x]}`,
          ''
        )}${delimiter}`
      }, '') + key
    )
  },
  createDigest () {
    const integrity = crypto.createHash('sha1')
    integrity.setEncoding('hex')
    return {
      write (data) {
        return integrity.write(data)
      },
      end () {
        return integrity.end()
      },
      read () {
        return integrity.read()
      }
    }
  }
}
