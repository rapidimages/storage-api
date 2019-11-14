# Storage api client

# [Content-addressable storage](https://en.wikipedia.org/wiki/Content-addressable_storage) api for files.

[![js-standard-style](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://github.com/feross/standard)
[![build status](https://api.travis-ci.org/rapidimages/storage-api.svg)](https://travis-ci.org/rapidimages/storage-api)
[![npm](https://img.shields.io/npm/v/@rapidimages/storage-api-client.svg)](https://npmjs.org/package/@rapidimages/storage-api-client)
[![downloads](https://img.shields.io/npm/dm/@rapidimages/storage-api-client.svg)](https://npmjs.org/package/@rapidimages/storage-api-client)

```js
const Client = require('@rapidimages/storage-api-client')
```

## `Client(url)`

`url` base url to storage api

Returns an instance of client.

# methods

## client.upload(files, [options])

`files` as an array of either file streams in node, or a file list from a input type file / drag drop.

`options.onUploadProgress({ percentage, total, loaded, totalMB, uploadedMB, file })`

`options.onHashProgress({ file, total, loaded, percentage})`

`options.onRequest(request)`

`options.onUnknown(unknown)` contains object of files that will be uploaded to api

## Usage

```js
const manifestKey = await Client('url').upload([files])
// a hash to the manifest of this upload containing all file keys
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

# license

[Apache License, Version 2.0](LICENSE)
