const busboy = require('busboy-wrapper')
const path = require('path')
const rimraf = require('rimraf')

module.exports = ({
  shardKey,
  meta,
  createReadStream,
  writeFile,
  mv,
  mkdirp,
  createDigest
}) => ({
  '@setup': ctx => {
    ctx.mime.default_type = ctx.mime.getType('bin')
  },
  '/unknown': {
    * post (req, res, _, parts) {
      const unknown = []
      for (const parts of yield req.json()) {
        const key = parts.split('.')[0]
        const missing = yield cb => meta(shardKey(key), err => cb(null, err))
        if (missing) unknown.push(parts)
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
      res.setNextErrorMessage('not found', 404)
      const { size } = yield cb => meta(filePath, cb)
      res.writeHead(200, {
        'content-type': res.getHeader('content-type'),
        etag: key,
        'last-modified': new Date().toGMTString(),
        'content-length': size
      })
      createReadStream(filePath).pipe(res)
    }
  },
  '/upload': {
    * post (req, res) {
      const { fields, files } = yield busboy(req, { createHash: createDigest })

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

      for (const name of fileKeys) {
        const file = files[name]
        const source = file.path
        const { size, hash: key } = file
        manifest.files.push({ size, name, key })

        const destination = shardKey(file.hash)
        yield cb => mkdirp(path.dirname(destination), cb)
        yield cb => mv(source, destination, cb)
        yield cb => rimraf(source, cb)
      }

      const data = JSON.stringify(manifest)
      const manifestKey = yield cb => {
        const digest = createDigest()
        digest.write(data)
        digest.end()
        cb(null, digest.read())
      }
      const destination = shardKey(manifestKey)
      yield cb => mkdirp(path.dirname(destination), cb)
      yield cb => writeFile(destination, data, cb)
      res.text(manifestKey)
    }
  }
})
