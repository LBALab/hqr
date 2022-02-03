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

## Examples

Make sure to backup your game files before using this library to mess with them.

### Read the palette data:

```js
const fs = require('fs/promises');
const { HQR } = require('@lbalab/hqr');

(async () => {
  const file = await fs.readFile('LBA2/RESS.HQR');
  const hqr = HQR.fromArrayBuffer(file.buffer);
  console.log(hqr.entries[0].content); // main game palette as an ArrayBuffer
})();
```

### Swap HQR entries:

```js
const fs = require('fs/promises');
const { HQR } = require('@lbalab/hqr');

/*
 ** Swap regular trees with palm trees in citadel island (with rain):
 ** Entry #0: regular tree
 ** Entry #1: palm tree
 */
(async () => {
  const file = await fs.readFile('LBA2/CITADEL.OBL');
  const hqr = HQR.fromArrayBuffer(file.buffer);
  const tmp = hqr.entries[0];
  hqr.entries[0] = hqr.entries[4];
  hqr.entries[4] = tmp;
  await fs.writeFile('LBA2/CITADEL.OBL', Buffer.from(hqr.toArrayBuffer()));
})();
```

### Change an HQR entry's content:

```js
const fs = require('fs/promises');
const { HQR } = require('@lbalab/hqr');

(async () => {
  const file = await fs.readFile('LBA2/TEXT.HQR');
  const hqr = HQR.fromArrayBuffer(file.buffer);
  const textBank = new Uint8Array(hqr.entries[1].content);
  /* The string "Resume Game" is at offset 943.
   ** Let's replace the letters e => é.
   */
  textBank[944] = 130;
  textBank[948] = 130;
  textBank[953] = 130;
  fs.writeFile('LBA2/TEXT.HQR', Buffer.from(hqr.toArrayBuffer()));
})();
```

### Create an HQR file programmatically:

```js
const fs = require('fs/promises');
const { HQR, HQREntry, CompressionType } = require('@lbalab/hqr');

/*
 ** This creates a SIMPLE.HQR file from scratch that contains 3 uncompressed entries:
 ** #0: 512 bytes entry filled with 0s
 ** #1: utf-8 string: "Hello world!"
 ** #2: 32 bit unsigned integer with value 42 (little endian)
 */
(async () => {
  const hqr = new HQR();

  // Entry #0: 512 bytes filled with 0s
  hqr.entries.push(new HQREntry(new ArrayBuffer(512), CompressionType.NONE));

  // Entry #1: utf-8 string: "Hello world!"
  const str = 'Hello world!';
  hqr.entries.push(
    new HQREntry(Buffer.from(str, 'utf-8'), CompressionType.NONE)
  );

  // Entry #2: 32 bit unsigned integer with value 42 (little endian)
  const numView = new DataView(new ArrayBuffer(4));
  numView.setUint32(0, 42, true);
  hqr.entries.push(new HQREntry(numView.buffer, CompressionType.NONE));

  await fs.writeFile('SIMPLE.HQR', Buffer.from(hqr.toArrayBuffer()));
})();
```

### Show hidden entries information:

```js
const fs = require('fs/promises');
const { HQR } = require('@lbalab/hqr');

(async () => {
  if (process.argv.length < 3) {
    console.error('Usage: node count-hidden.js <HQR file>');
    process.exit(1);
  }
  const file = await fs.readFile(process.argv[2]);
  const hqr = HQR.fromArrayBuffer(file.buffer);
  for (let i = 0; i < hqr.entries.length; i++) {
    const entry = hqr.entries[i];
    if (!entry) continue;

    console.log(`Entry ${i} has ${entry.hiddenEntries.length} hidden entries:`);
    let j = 0;
    for (const hEntry of entry.hiddenEntries) {
      console.log(`  Hidden entry #${j}: ${hEntry.content.byteLength} bytes`);
      j++;
    }
  }
})();

/* Example output:

$> node count-hidden.js LBA2/VOX/EN_000.VOX
Entry 154 has 4 hidden entries:
  Hidden entry #0: 187692 bytes
  Hidden entry #1: 156532 bytes
  Hidden entry #2: 144304 bytes
  Hidden entry #3: 78528 bytes
Entry 205 has 1 hidden entries:
  Hidden entry #0: 139520 bytes
Entry 232 has 1 hidden entries:
  Hidden entry #0: 184860 bytes
Entry 316 has 1 hidden entries:
  Hidden entry #0: 116344 bytes

**/
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
