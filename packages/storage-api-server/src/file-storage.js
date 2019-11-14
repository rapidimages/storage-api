const fs = require('fs')
const crypto = require('crypto')
const path = require('path')
const mv = require('move-file')
const mkdirp = require('make-dir')

const { STORAGE_PATH } = process.env

module.exports = {
  async meta (key) {
    const filePath = shardKey(key)
    return fs.promises.stat(filePath).catch(_ => ({}))
  },
  createReadStream (key) {
    const filePath = shardKey(key)
    return fs.createReadStream(filePath)
  },
  async uploadFile (source, key, cb) {
    const destination = shardKey(key)
    await mkdirp(path.dirname(destination))
    await mv(source, destination)
  },
  async uploadManifest (key, data) {
    const destination = shardKey(key)
    await mkdirp(path.dirname(destination))
    await fs.promises.writeFile(destination, data)
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

function shardKey (key) {
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
}
