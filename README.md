# HQR Library

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]
[![Code Coverage][codecov-img]][codecov-url]
[![Commitizen Friendly][commitizen-img]][commitizen-url]
[![Semantic Release][semantic-release-img]][semantic-release-url]

A javascript HQR reader/writer for node.js and web browsers.
HQR is a simple file format used by the Little Big Adventure 1 & 2 games for storing data.

A HQR file consists of a header followed by a series of entries which are either compressed or not. It can also contain hidden entries, as a mechanism to store several entries in the same index.

For more information about the content of the various HQR files found in LBA1 and LBA2 game folders, see [here][lba-file-info-url].

## Install

```bash
npm install @lbalab/hqr
```

## Usage

Read the palette from the game's RESS.HQR file:

```js
const fs = require('fs/promises');
const { HQR } = require('@lbalab/hqr');

(async () => {
  const file = await fs.readFile('RESS.HQR');
  const hqr = HQR.fromArrayBuffer(file.buffer);
  console.log(hqr.entries[0].content); // game palette as an ArrayBuffer
})();
```

Create an HQR file programmatically and export it to a file:

```js
const fs = require('fs/promises');
const { HQR, HQREntry, CompressionType } = require('@lbalab/hqr');

(async () => {
  const hqr = new HQR();
  const str = 'Hello world!';
  hqr.entries.push(new HQREntry(new ArrayBuffer(512), CompressionType.NONE));
  hqr.entries.push(
    new HQREntry(Buffer.from(str, 'utf-8'), CompressionType.NONE)
  );
  const numView = new DataView(new ArrayBuffer(4));
  numView.setUint32(0, 42, true);
  hqr.entries.push(new HQREntry(numView.buffer, CompressionType.NONE));
  await fs.writeFile('SIMPLE.HQR', Buffer.from(hqr.toArrayBuffer()));
})();
```

[build-img]: https://github.com/LBALab/hqr/actions/workflows/release.yml/badge.svg
[build-url]: https://github.com/LBALab/hqr/actions/workflows/release.yml
[downloads-img]: https://img.shields.io/npm/dt/@lbalab/hqr
[downloads-url]: https://www.npmtrends.com/@lbalab/hqr
[npm-img]: https://img.shields.io/npm/v/@lbalab/hqr
[npm-url]: https://www.npmjs.com/package/@lbalab/hqr
[issues-img]: https://img.shields.io/github/issues/LBALab/hqr
[issues-url]: https://github.com/LBALab/hqr/issues
[codecov-img]: https://codecov.io/gh/LBALab/hqr/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/LBALab/hqr
[semantic-release-img]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]: https://github.com/semantic-release/semantic-release
[commitizen-img]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
[lba-file-info-url]: http://lbafileinfo.kaziq.net/index.php/Main_Page
