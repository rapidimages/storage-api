const tap = require('tap')
const { spawn } = require('child_process')
const path = require('path')
const client = require('./packages/storage-api-client')('http://localhost:5000')
const fs = require('fs')
const rimraf = require('rimraf')
const http = require('http')
const FormData = require('./packages/storage-api-client/node_modules/form-data')

tap.cleanSnapshot = s => {
  return s.replace(/"path":"[^"]*"/g, 'temporary-path')
}

const { test } = tap

const get = url =>
  new Promise((resolve, reject) => {
    const request = http.get(url, res => {
      if (res.statusCode !== 200) return reject(new Error('error'))
      let buffer = ''
      res.on('data', chunk => {
        buffer += chunk
      })
      res.on('end', () => resolve(buffer.toString()))
      res.on('error', reject)
      res.resume()
    })
    request.on('error', reject)
  })

const get304 = key =>
  new Promise((resolve, reject) => {
    const request = http.get(
      `http://localhost:5000/get/${key}`,
      { headers: { 'if-none-match': key } },
      res => {
        if (res.statusCode !== 304) return reject(new Error('error'))
        resolve()
        res.resume()
      }
    )
    request.on('error', reject)
  })

const get404 = key =>
  new Promise((resolve, reject) => {
    const request = http.get(`http://localhost:5000/get/${key}`, res => {
      if (res.statusCode !== 404) return reject(new Error('error'))
      resolve()
      res.resume()
    })
    request.on('error', reject)
  })

process.env.PORT = 5000
process.env.STORAGE_PATH = path.join(
  require('os').tmpdir(),
  'storage',
  new Date().getTime().toString(36)
)

const server =
  !process.env.NO_SERVER &&
  spawn('node', ['./test-server'], {
    env: process.env,
    stdio: process.env.DEBUG ? 'inherit' : ''
  })

test('server is running', t => {
  ;(function poll () {
    get('http://localhost:5000/ping').then(t.end, () => {
      setTimeout(poll, 200)
    })
  })()
})

test('upload this file to storage', async t => {
  const hash = await client.upload([fs.createReadStream('LICENSE')], {
    onUploadProgress () {
      t.ok(true, 'onUploadProgress called')
    },
    onHashProgress () {
      t.ok(true, 'onHashProgress called')
    },
    onRequest () {
      t.ok(true, 'onRequest called')
    },
    onUnknown (unknown) {
      t.ok(unknown.LICENSE, 'file will be uploaded')
    }
  })

  t.matchSnapshot(hash.toString())
})

test("upload same file to storage checking it's known", async t => {
  const hash = await client.upload([fs.createReadStream('LICENSE')], {
    onUploadProgress () {
      t.ok(true, 'onUploadProgress called')
    },
    onHashProgress () {
      t.ok(true, 'onHashProgress called')
    },
    onRequest () {
      t.ok(true, 'onRequest called')
    },
    onUnknown (unknown) {
      t.notOk(unknown.LICENSE, 'file should be known')
    }
  })

  t.matchSnapshot(hash.toString())
})

test('upload multiple files', async t => {
  const hash = await client.upload(
    [fs.createReadStream('LICENSE'), fs.createReadStream('test-server.js')],
    {
      onUploadProgress () {
        t.ok(true, 'onUploadProgress called')
      },
      onHashProgress () {
        t.ok(true, 'onHashProgress called')
      },
      onRequest () {
        t.ok(true, 'onRequest called')
      },
      onUnknown (unknown) {
        t.notOk(unknown.LICENSE, 'file should be known')
        t.ok(unknown['test-server.js'], 'file should be known')
      }
    }
  )

  t.matchSnapshot(hash.toString())
})

test('etag for known file', async t => {
  const hash = await client.upload([fs.createReadStream('LICENSE')])
  await get304(hash.toString())
})

test('uploading no files fails', async t => {
  try {
    await client.upload([])
    t.fail()
  } catch (err) {
    t.pass()
  }
})

test('uploading fails on server if multipart has no files', t => {
  t.plan(2)
  const form = new FormData()
  form.submit('http://localhost:5000/upload', (err, res) => {
    t.error(err)
    t.equals(res.statusCode, 400)
  })
})

test('uploading no files should fail', async t => {
  try {
    await client.upload([])
    t.fail()
  } catch (err) {
    t.pass()
  }
})

test('uploading same file again just gets manifest', async t => {
  const hash = await client.upload([fs.createReadStream('LICENSE')], {
    onUnknown (unknown) {
      t.equals(Object.keys(unknown).length, 0, 'file known by server')
    }
  })

  t.matchSnapshot(hash.toString())
})

test('check manifest for upload', async t => {
  t.matchSnapshot(
    await get(
      'http://localhost:5000/get/ff7bdf679d697b88c47436aba24b9136c046da92.json'
    )
  )
  t.matchSnapshot(
    await get(
      'http://localhost:5000/get/81fd98ae93fd5e0a79ebca20ec8881478fe402a8.md'
    )
  )
})

test('check 404 returned for missing files', async t => {
  await get404('thishashdoesnotexist')
})

test('headers when getting files', t => {
  const url =
    'http://localhost:5000/get/ff7bdf679d697b88c47436aba24b9136c046da92.json'
  http.get(url, res => {
    t.equals(res.statusCode, 200)
    t.equals(res.headers.etag, 'ff7bdf679d697b88c47436aba24b9136c046da92')
    t.equals(res.headers['cache-control'], 'max-age=31557600')
    t.end()
  })
})

!process.env.NO_SERVER &&
  test('cleanup', t => {
    server.kill()
    rimraf(process.env.STORAGE_PATH, t.end)
  })
