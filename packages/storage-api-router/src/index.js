const busboy = require('busboy-wrapper')
const del = require('del')
const pump = require('pump')
const router = require('server-base-router')
const ms = require('ms')

module.exports = ({
  shardKey,
  meta,
  createReadStream,
  createDigest,
  uploadFile,
  uploadManifest
}) =>
  router({
    '/unknown': {
      * post (req, res, _, parts) {
        const unknown = []
        for (const parts of yield req.json()) {
          const key = parts.split('.')[0]
          const filePath = shardKey(key)
          const { size } = yield cb => meta(filePath, cb)
          if (size === undefined) unknown.push(parts)
        }
        res.json(unknown)
      }
    },
    '/get/.*': {
      * get (req, res, _, parts) {
        const key = parts.split('.')[0]
        if (req.headers['if-none-match'] === key) {
          res.writeHead(304)
          res.end()
          return
        }
        const filePath = shardKey(key)
        const { size } = yield cb => meta(filePath, cb)
        if (size === undefined) {
          res.writeHead(404)
          return res.end()
        }
        res.writeHead(200, {
          'content-type': res.getHeader('content-type'),
          'cache-control': `max-age=${ms('1 year')}`,
          etag: key,
          'last-modified': new Date().toGMTString(),
          'content-length': size
        })
        pump(createReadStream(filePath), res, err => {
          if (err) res.error(err)
        })
      }
    },
    '/upload': {
      * post (req, res) {
        const { fields, files } = yield busboy(req, {
          createHash: createDigest
        })

        const fieldKeys = Object.keys(fields)
        const fileKeys = Object.keys(files)
        const manifest = { files: [] }

        if (fieldKeys.length) {
          manifest.files.push(
            ...fieldKeys.map(fieldKey => {
              const { size, name, key } = JSON.parse(fields[fieldKey])
              return { size, name, key }
            })
          )
        }

        if (!fileKeys.length && !fieldKeys.length) {
          return res.error('no files', 400)
        }

        const pendingUploads = []

        for (const name of fileKeys) {
          const file = files[name]
          const source = file.path
          const { size, hash: key } = file
          manifest.files.push({ size, name, key })
          const destination = shardKey(file.hash)
          pendingUploads.push(
            uploadFile(source, destination).then(() => del(source))
          )
        }

        const data = JSON.stringify(manifest)
        const manifestKey = yield cb => {
          const digest = createDigest()
          digest.write(data)
          digest.end()
          cb(null, digest.read())
        }
        const destination = shardKey(manifestKey)
        pendingUploads.push(uploadManifest(destination, data))

        yield * pendingUploads

        res.text(manifestKey)
      }
    }
  })
