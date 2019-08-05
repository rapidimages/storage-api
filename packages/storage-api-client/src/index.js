import fs from 'fs'
import FormData from 'form-data'
import hyperquest from 'hyperquest'
import crypto from 'crypto'
import concat from 'concat-stream'
import once from 'once'
import uploadProgress from './upload-progress'
import hashProgress from './hash-progress'
import defaults from './defaults'

const debug = require('debug')('@rapidimages/storage-api-client')

export default (url) => {
  if (!url) throw new Error('url must be specified')
  return { upload }

  function upload (files = [], opts) {
    const { onUploadProgress, onHashProgress, onUnknown, onRequest } = defaults(opts)
    files = files.map((file) => file.path ? file.path : file)
    return new Promise((resolve, reject) => {
      if (!files.length) reject(new Error('no files specified'))
      getKeys(files, onHashProgress, (err, keys) => {
        if (err) return reject(err)
        getUnknownKeys(url, keys, (err, unknown) => {
          if (err) return reject(err)
          onUnknown(unknown)
          getStats(files, (err, stats) => {
            if (err) return reject(err)
            const progress = uploadProgress(Object.keys(stats).reduce((sum, key) => {
              if (unknown[key]) {
                sum.push({
                  size: stats[key].size,
                  name: key
                })
              }
              return sum
            }, []))
            const form = new FormData()
            files.forEach((file) => {
              if (unknown[file]) {
                form.append(file, fs.createReadStream(file))
              } else {
                debug(`file ${file} already known sending details only`)
                form.append(file, JSON.stringify({ name: file, key: keys[file], size: stats[file].size }))
              }
            })
            const request = form.submit(`${url}/upload`, (err, res) => {
              if (err || res.statusCode !== 200) return reject(new Error(`failed to upload ${err}`))
              res.pipe(concat((key) => resolve(key)))
            })
            onRequest(request)
            let total
            let loaded = 0
            const pendingProgress = []
            form.on('data', (data) => {
              loaded += data.length
              if (total) {
                onUploadProgress(progress({ loaded, total }))
              } else {
                pendingProgress.push(loaded)
              }
            })
            form.getLength((err, length) => {
              if (!err) {
                total = length
                pendingProgress.forEach((loaded) => onUploadProgress(progress({ loaded, total })))
              }
            })
          })
        })
      })
    })
  }
}

function getStats (files, cb) {
  cb = once(cb)
  let pending = files.length
  const stats = {}
  files.forEach((file) => {
    fs.stat(file, (err, stat) => {
      if (err) return cb(err)
      stats[file] = stat
      done()
    })
  })

  function done () {
    if (!--pending) {
      debug('gettings stats for files %j got %j', files, stats)
      cb(null, stats)
    }
  }
}

function getKeys (files, onHashProgress, cb) {
  cb = once(cb)
  let loaded = 0
  const keys = {}
  files.forEach((file) => {
    progress(file)
    const sha1 = crypto.createHash('sha1')
    sha1.setEncoding('hex')
    fs.createReadStream(file)
      .on('data', sha1.write.bind(sha1))
      .on('end', () => {
        sha1.end()
        keys[file] = sha1.read()
        done()
      })
      .on('err', cb)
  })

  function progress (file) {
    onHashProgress(hashProgress({
      file,
      total: files.length,
      loaded: loaded
    }))
  }

  function done (file) {
    loaded++
    progress(file)
    if (loaded === files.length) {
      debug('gettings keys for files %j got %j', files, keys)
      cb(null, keys)
    }
  }
}

function getUnknownKeys (url, details, cb) {
  const keys = Object.keys(details).map((x) => details[x])
  const request = hyperquest.post(`${url}/unknown`, (err, res) => {
    if (err || res.statusCode !== 200) return cb(new Error(`failed to get unknown keys ${err}`))
    res.pipe(concat((data) => {
      data = JSON.parse(data)
      const unknown = {}
      data.forEach((key) => {
        const file = Object.keys(details).filter((x) => details[x] === key)[0]
        unknown[file] = key
      })
      debug('checking unknown %j and got %j', keys, unknown)
      cb(null, unknown)
    }))
  })
  request.write(JSON.stringify(keys))
  request.end()
}
