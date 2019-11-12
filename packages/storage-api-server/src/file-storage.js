const fs = require('fs')
const crypto = require('crypto')
const path = require('path')
const mv = require('move-file')
const mkdirp = require('make-dir')

const { STORAGE_PATH } = process.env

module.exports = {
  meta (filePath, cb) {
    return fs.stat(filePath, cb)
  },
  createReadStream (filePath) {
    return fs.createReadStream(filePath)
  },
  async uploadFile (source, destination, cb) {
    await mkdirp(path.dirname(destination))
    await mv(source, destination)
  },
  async uploadManifest (destination, data) {
    await mkdirp(path.dirname(destination))
    await fs.promises.writeFile(destination, data)
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
