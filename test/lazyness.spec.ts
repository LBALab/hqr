import { readHQRFile } from './utils';
import { HQR, CompressionType } from '../src';
import * as compression from '../src/compression';

const expectedSizes = [512, 12, 4];

describe('Lazy loading', () => {
  it('should load a HQR file lazily, not decoding the entries', async () => {
    const decodeEntry = jest.spyOn(compression, 'decodeEntry');
    const file = await readHQRFile('SIMPLE.HQR');
    const hqr = HQR.fromArrayBuffer(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
    );
    for (let i = 0; i < hqr.entries.length; i += 1) {
      const entry = hqr.entries[i];
      expect(entry?.type).toBe(CompressionType.NONE);
    }
    expect(decodeEntry).toHaveBeenCalledTimes(0);
    decodeEntry.mockClear();
  });

  it('should load a HQR file lazily, decoding the entries later', async () => {
    const decodeEntry = jest.spyOn(compression, 'decodeEntry');
    const file = await readHQRFile('SIMPLE.HQR');
    const hqr = HQR.fromArrayBuffer(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
    );
    expect(decodeEntry).toHaveBeenCalledTimes(0);
    for (let i = 0; i < hqr.entries.length; i += 1) {
      const entry = hqr.entries[i];
      expect(entry?.type).toBe(CompressionType.NONE);
      expect(entry?.content.byteLength).toBe(expectedSizes[i]);
    }
    expect(decodeEntry).toHaveBeenCalledTimes(3);
    decodeEntry.mockClear();
  });

  it('should load a HQR file without lazy loading, decoding the entries all at once', async () => {
    const decodeEntry = jest.spyOn(compression, 'decodeEntry');
    const file = await readHQRFile('SIMPLE.HQR');
    const hqr = HQR.fromArrayBuffer(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
      { lazyLoad: false }
    );
    expect(decodeEntry).toHaveBeenCalledTimes(3);
    decodeEntry.mockClear();
    for (let i = 0; i < hqr.entries.length; i += 1) {
      const entry = hqr.entries[i];
      expect(entry?.type).toBe(CompressionType.NONE);
      expect(entry?.content.byteLength).toBe(expectedSizes[i]);
    }
    expect(decodeEntry).toHaveBeenCalledTimes(0);
    decodeEntry.mockClear();
  });
});
