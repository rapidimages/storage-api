# Storage api [![js-standard-style](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://github.com/feross/standard) [![build status](https://api.travis-ci.org/rapidimages/storage-api.svg)](https://travis-ci.org/rapidimages/storage-api) [![npm](https://img.shields.io/npm/v/@rapidimages/storage-api-server.svg)](https://npmjs.org/package/@rapidimages/storage-api-server) [![downloads](https://img.shields.io/npm/dm/@rapidimages/storage-api-server.svg)](https://npmjs.org/package/@rapidimages/storage-api-server) [![Docker Pulls](https://img.shields.io/docker/pulls/rapidimages/storage-api.svg)]()

# [Content-addressable storage](https://en.wikipedia.org/wiki/Content-addressable_storage) api for files.

## [Client](packages/storage-api-client) and [Server](packages/storage-api-server) for file storage.

# Client

```js
const Client = require('@rapidimages/storage-api-client')
```

## `Client(url)`

`url` base url to storage api

Returns an instance of client.

# methods

## client.upload(files, [options])

`files` is an array of either file streams in node, or a file list from a input type file / drag drop.

`options.onUploadProgress({ percentage, total, loaded, totalMB, uploadedMB, file })`

`options.onHashProgress({ file, total, loaded, percentage})`

`options.onRequest(request)`

`options.onUnknown(unknown)` contains object of files that will be uploaded to api

## Usage
```js
  Client('url')
  .upload([files])
  .then((manifestKey) => {
    // a hash to the manifest of this upload containing all file keys
  })
```

All files are hashed using `sha1` both in the browser and node.

Each upload will create a manifest in the following format

```js
{
  "files": [
    {
      "size": 697,
      "name": "filepath",
      "key": "0d5061684f1d3c8262bfdefe5c373131a6358aba"
    }
  ]
}
```

All files including the manifest are served using http `/get/key`

# Upload

Files that are known by the server will not be uploaded again :) this is thanks to sha1 hashing.

# Server

```sh
STORAGE_PATH=x LOG_PRETTY=1 PORT=5000 npm start
```

# http get /get/key.type

.type is optional will either return content or 404 if not found.

# http post /get/unknown

`body contains an array of hashes`

Will return an array of unknown hashes.

# http post multipart /upload

Will return a string which will be the sha1 hash of the manifest.

# Running Server in docker

```sh
ᐅ docker pull rapidimages/storage-api:version
ᐅ docker run --rm --name storage-api -p 5000:5000 rapidimages/storage-api:version
```

This is the recommended way of running the server behind a reverse proxy like [traefik](https://traefik.io/).

# license

[Apache License, Version 2.0](LICENSE)
