const busboy = require('busboy-wrapper')
const rimraf = require('rimraf')
const crypto = require('crypto')
const AWS = require('aws-sdk')
const fs = require('fs')
const S3 = () => new AWS.S3({
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET
})
const s3File = (file) => ({ Bucket: process.env.S3_BUCKET, Key: file })

module.exports = ({
  '@setup': (ctx) => {
    ctx.mime.default_type = ctx.mime.lookup('bin')
  },
  '/unknown': {
    * post (q, r, _, parts) {
      const unknown = []
      for (const parts of yield q.json()) {
        const key = parts.split('.')[0]
        const s3 = S3()
        const missing = yield (cb) => s3.headObject(s3File(key), (err) => {
          cb(null, err && err.code === 'NotFound')
        })
        if (missing) unknown.push(parts)
      }
      r.json(unknown)
    }
  },
  '/get/.*': {
    * get (q, r, _, parts) {
      const key = parts.split('.')[0]
      if (q.headers['if-none-match'] === key) {
        r.writeHead(304)
        r.end()
        return
      }
      const s3 = S3()
      r.setNextErrorMessage('not found', 404)
      const { ContentLength } = yield (cb) => {
        s3.headObject(s3File(key), cb)
      }
      r.writeHead(200, {
        'content-type': r.getHeader('content-type'),
        'etag': key,
        'last-modified': new Date().toGMTString(),
        'content-length': ContentLength
      })
      const getObject = s3.getObject(s3File(key))
      getObject.on('build', () => {
        getObject.httpRequest.headers['Expect'] = '100-continue'
      })
      getObject
        .createReadStream()
        .on('error', () => r.end())
        .pipe(r)
    }
  },
  '/upload': {
    * post (q, r) {
      const [ fields, files ] =
        yield (cb) =>
          busboy(q, (err, fields, files) => cb(err, [ fields, files ]))

      const fieldKeys = Object.keys(fields)
      const fileKeys = Object.keys(files)
      const manifest = { files: [] }

      if (fieldKeys.length) {
        manifest.files.push(...fieldKeys.map((fieldKey) => {
          const { size, name, key } = JSON.parse(fields[fieldKey])
          return { size, name, key }
        }))
      }

      if (!fileKeys.length && !fieldKeys.length) return r.error('no files', 400)

      for (const name of fileKeys) {
        const file = files[name]
        const source = file.path
        const { size, hash: key } = file
        manifest.files.push({ size, name, key })

        const fileStream = fs.createReadStream(source)
        yield uploadToS3(key, fileStream)
        yield (cb) => rimraf(source, cb)
      }

      const data = JSON.stringify(manifest)
      const manifestKey = crypto.createHash('sha1').update(data).digest('hex')
      yield uploadToS3(manifestKey, data)
      r.text(manifestKey)
    }
  }
})

function uploadToS3 (key, data) {
  const params = s3File(key)
  return (cb) => {
    const s3 = S3()
    s3.headObject(params, (err, res) => {
      if (!err && res) return cb(null)
      s3.putObject(Object.assign({}, params, { Body: data }), (err) => {
        if (err) return cb(err)
        s3.waitFor('objectExists', params, cb)
      })
    })
  }
}
