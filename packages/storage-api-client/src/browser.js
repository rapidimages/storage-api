import uploadProgress from './upload-progress'
import hashProgress from './hash-progress'
import once from 'once'
import defaults from './defaults'
import browserDebug from './browser-debug'

const rusha = window.atob('replace_with_rusha')
const debug = browserDebug('@rapidimages/storage-api-client')

export default (url = '') => {
  return { upload }
  function upload (files, opts) {
    const { onUploadProgress, onHashProgress, onUnknown, onRequest } = defaults(opts)
    files = [].slice.call(files)
    return new Promise((resolve, reject) => {
      if (!files.length) reject(new Error('no files specified'))
      getKeys(files, onHashProgress, (err, keys) => {
        if (err) return reject(err)
        getUnknownKeys(url, keys, (err, unknown) => {
          if (err) return reject(err)
          onUnknown(unknown)
          const form = new window.FormData()
          files.forEach((file) => {
            if (unknown[file.name]) {
              form.append(file.name, file)
            } else {
              debug(`file ${file.name} already known sending details only`)
              form.append(file.name, JSON.stringify({ name: file.name, key: keys[file.name], size: file.size }))
            }
          })
          const progress = uploadProgress(files.filter((x) => unknown[x.name]))
          const request = new window.XMLHttpRequest()
          onRequest(request)
          request.upload.addEventListener('progress', (e) => onUploadProgress(progress(e)))
          request.upload.addEventListener('error', (err) => reject(err))
          request.addEventListener('load', (e) => resolve(request.responseText))
          request.open('POST', `${url}/upload`)
          request.send(form)
        })
      })
    })
  }
}

function getKeys (files, onHashProgress, cb) {
  cb = once(cb)
  let loaded = 0
  const keys = {}
  files.forEach((file) => {
    progress(file.name)
    var worker = createWorker(rusha)
    worker.addEventListener('message', (e) => {
      keys[e.data.id] = e.data.hash
      worker.revoke()
      done(file.name)
    })
    worker.postMessage({ id: file.name, file })
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
      debug('gettings keys for files %o got %o', files, keys)
      cb(null, keys)
    }
  }
}

function getUnknownKeys (url, details, cb) {
  cb = once(cb)
  const keys = Object.keys(details).map((x) => details[x])
  window.fetch(`${url}/unknown`, {
    method: 'POST',
    credentials: 'same-origin',
    redirect: 'manual',
    body: JSON.stringify(keys)
  })
    .then(checkStatus)
    .then((res) => res.json())
    .then((data) => {
      const unknown = {}
      data.forEach((key) => {
        const file = Object.keys(details).filter((x) => details[x] === key)[0]
        unknown[file] = key
      })
      debug('checking unknown %j and got %j', keys, unknown)
      cb(null, unknown)
    })
    .catch(cb)
}

function createWorker (src) {
  const URL = window.URL || window.webkitURL || window.mozURL || window.msURL
  const blob = new window.Blob([src], { type: 'text/javascript' })
  const workerUrl = URL.createObjectURL(blob)
  const worker = new window.Worker(workerUrl)
  worker.revoke = () => URL.revokeObjectURL(workerUrl)
  return worker
}

function checkStatus (res) {
  return res.status === 200 ? Promise.resolve(res) : res.text().then((text) => Promise.reject(text))
}
