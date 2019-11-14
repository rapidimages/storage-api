const busboy = require('busboy-wrapper')
const del = require('del')
const pump = require('pump')
const router = require('server-base-router')

module.exports = ({
  meta,
  createReadStream,
  createDigest,
  uploadFile,
  uploadManifest
}) =>
  router({
    '/unknown': {
      async post (req, res, _, parts) {
        const unknown = []
        for (const parts of await req.json()) {
          const key = parts.split('.')[0]
          const { size } = await meta(key)
          if (size === undefined) unknown.push(parts)
        }
        res.json(unknown)
      }
    },
    '/get/.*': {
      async get (req, res, _, parts) {
        const key = parts.split('.')[0]
        if (req.headers['if-none-match'] === key) {
          res.writeHead(304)
          res.end()
          return
        }
        const { size } = await meta(key)
        if (size === undefined) {
          res.writeHead(404)
          return res.end()
        }

        const ONE_YEAR_IN_SECONDS = 31557600

        res.writeHead(200, {
          'content-type': res.getHeader('content-type'),
          'cache-control': `max-age=${ONE_YEAR_IN_SECONDS}`,
          etag: key,
          'last-modified': new Date().toGMTString(),
          'content-length': size
        })
        const contentStream = await createReadStream(key)
        pump(contentStream, res, err => {
          if (err) res.error(err)
        })
      }
    },
    '/upload': {
      async post (req, res) {
        const { fields, files } = await busboy(req, {
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
          pendingUploads.push(
            uploadFile(source, file.hash).then(() => del(source, { force: true }))
          )
        }

        const data = JSON.stringify(manifest)
        const digest = createDigest()
        digest.write(data)
        digest.end()
        const manifestKey = digest.read()
        pendingUploads.push(uploadManifest(manifestKey, data))

        await Promise.all(pendingUploads)

        res.text(manifestKey)
      }
    }
  })
