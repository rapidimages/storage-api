const concat = require('concat-stream')
const test = require('tape')
const { spawn } = require('child_process')
const path = require('path')
const client = require('./packages/storage-api-client')('http://localhost:5000')
const fs = require('fs')
const rimraf = require('rimraf')
const crypto = require('crypto')
const http = require('http')

const get = (url, cb) => {
  const request = http.get(url, (res) => {
    if (res.statusCode !== 200) return cb(new Error('error'))
    res.pipe(concat((data) => cb(null, data)))
    res.resume()
  })
  request.on('error', cb)
}

const LICENSE = fs.readFileSync('LICENSE', 'utf-8')
const LICENSE_HASH = crypto.createHash('sha1').update(LICENSE).digest('hex')

process.env.PORT = 5000
process.env.STORAGE_PATH = path.join(require('os').tmpdir(), 'storage', new Date().getTime().toString(36))

const server = spawn('node', ['./packages/storage-api-server/index.js'], { env: process.env, stdio: process.env.DEBUG ? 'inherit' : '' })

process.on('exit', server.kill.bind(server))

test('server is running', (t) => {
  ;(function poll () {
    get('http://localhost:5000/ping', (err, data) => {
      if (err) return setTimeout(poll, 200)
      t.end()
    })
  })()
})

test('upload this file to storage', (t) => {
  client.upload([fs.createReadStream('LICENSE')], {
    onUploadProgress () { t.ok(true, 'onUploadProgress called') },
    onHashProgress () { t.ok(true, 'onHashProgress called') },
    onRequest () { t.ok(true, 'onRequest called') },
    onUnknown (unknown) { t.ok(unknown.LICENSE, 'file will be uploaded') }
  })
  .then((hash) => {
    t.equals(hash.toString(), 'ff7bdf679d697b88c47436aba24b9136c046da92', 'upload manifest hash')
    t.end()
  })
})

test('uploading same file again just gets manifest', (t) => {
  t.plan(2)
  client.upload([fs.createReadStream('LICENSE')], {
    onUnknown (unknown) { t.equals(Object.keys(unknown).length, 0, 'file known by server') }
  })
  .then((hash) => {
    t.equals(hash.toString(), 'ff7bdf679d697b88c47436aba24b9136c046da92', 'still same hash')
  })
})

test('check manifest for upload', (t) => {
  get('http://localhost:5000/get/ff7bdf679d697b88c47436aba24b9136c046da92.json', (err, data) => {
    t.error(err, 'got manifest')
    const manifest = JSON.parse(data)
    t.equals(manifest.files[0].key, '81fd98ae93fd5e0a79ebca20ec8881478fe402a8', 'manifest file')
    get('http://localhost:5000/get/81fd98ae93fd5e0a79ebca20ec8881478fe402a8.md', (err, data) => {
      t.error(err, 'got license')
      t.equals(data.toString(), LICENSE, 'license data')
      t.equals(crypto.createHash('sha1').update(data).digest('hex'), LICENSE_HASH, 'license hash')
      t.end()
    })
  })
})

test('cleanup', (t) => {
  server.kill()
  rimraf(process.env.STORAGE_PATH, t.end)
})
