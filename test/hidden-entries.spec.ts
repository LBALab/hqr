import { HQR, HQREntry } from '../src';
import { readHQRFile, binaryCompare } from './utils';
import * as compression from '../src/compression';
import { CompressionType } from '../src/types';

describe('Hidden entries', () => {
  it('should read a HQR file with hidden entries', async () => {
    const file = await readHQRFile('HIDDEN.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    expect(hqr.entries.length).toBe(3);
    expect(hqr.entries[0]?.content.byteLength).toBe(32);
    const entryWithHidden = hqr.entries[1];
    expect(entryWithHidden?.content.byteLength).toBe(512);
    expect(entryWithHidden?.hiddenEntries.length).toBe(2);
    expect(entryWithHidden?.hiddenEntries[0].content.byteLength).toBe(454);
    expect(entryWithHidden?.hiddenEntries[1].content.byteLength).toBe(12);
    expect(hqr.entries[2]?.content.byteLength).toBe(64);
  });

  it('should lazily read hidden entries, out of order', async () => {
    const decodeEntry = jest.spyOn(compression, 'decodeEntry');
    const file = await readHQRFile('HIDDEN.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    expect(hqr.entries.length).toBe(3);
    expect(decodeEntry).toHaveBeenCalledTimes(0);
    expect(hqr.entries[1]?.hiddenEntries[1].content.byteLength).toBe(12);
    expect(decodeEntry).toHaveBeenCalledTimes(1);
    expect(hqr.entries[1]?.hiddenEntries[0].content.byteLength).toBe(454);
    expect(decodeEntry).toHaveBeenCalledTimes(2);
    decodeEntry.mockClear();
  });

  it('should read a HQR file with hidden entries, without lazy loading', async () => {
    const decodeEntry = jest.spyOn(compression, 'decodeEntry');
    const file = await readHQRFile('HIDDEN.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer, { lazyLoad: false });
    expect(decodeEntry).toHaveBeenCalledTimes(5);
    expect(hqr.entries.length).toBe(3);
    decodeEntry.mockClear();
    expect(hqr.entries[1]?.hiddenEntries[1].content.byteLength).toBe(12);
    expect(hqr.entries[1]?.hiddenEntries[0].content.byteLength).toBe(454);
    expect(decodeEntry).toHaveBeenCalledTimes(0);
    decodeEntry.mockClear();
  });

  it('should write a binary equivalent of HIDDEN.HQR', async () => {
    const hqr = new HQR();
    hqr.entries.push(new HQREntry(new ArrayBuffer(32), CompressionType.NONE));
    const entry = new HQREntry(new ArrayBuffer(512), CompressionType.NONE);
    entry.hiddenEntries.push(
      new HQREntry(new ArrayBuffer(454), CompressionType.NONE)
    );
    entry.hiddenEntries.push(
      new HQREntry(new ArrayBuffer(12), CompressionType.NONE)
    );
    hqr.entries.push(entry);
    hqr.entries.push(new HQREntry(new ArrayBuffer(64), CompressionType.NONE));

    await binaryCompare(hqr, 'HIDDEN.HQR');
  });

  it('should flatten hidden entries tree', async () => {
    const hqr = new HQR();
    hqr.entries.push(new HQREntry(new ArrayBuffer(32), CompressionType.NONE));
    const entry = new HQREntry(new ArrayBuffer(512), CompressionType.NONE);
    entry.hiddenEntries.push(
      new HQREntry(new ArrayBuffer(454), CompressionType.NONE)
    );
    entry.hiddenEntries[0].hiddenEntries.push(
      new HQREntry(new ArrayBuffer(12), CompressionType.NONE)
    );
    hqr.entries.push(entry);
    hqr.entries.push(new HQREntry(new ArrayBuffer(64), CompressionType.NONE));

    await binaryCompare(hqr, 'HIDDEN.HQR');
  });
});
