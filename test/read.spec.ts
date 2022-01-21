import { HQR } from '../src';
import { readHQRFile } from './utils';

describe('Read HQR files', () => {
  /*
   ** SIMPLE.HQR contains 3 uncompressed entries:
   ** #0: 512 bytes entry filled with 0s
   ** #1: utf-8 string: "Hello world!"
   ** #2: 32 bit unsigned integer with value 42 (little endian)
   */
  it('should read a simple HQR file', async () => {
    const file = await readHQRFile('SIMPLE.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    expect(hqr.entries.length).toBe(3);
    expect(hqr.entries[0]?.content.byteLength).toBe(512);
    const buffer = Buffer.from(hqr.entries[1]?.content as ArrayBuffer);
    const str = buffer.toString('utf8');
    expect(str).toBe('Hello world!');
    const contentView = new DataView(hqr.entries[2]?.content as ArrayBuffer);
    expect(contentView.getUint32(0, true)).toBe(42);
  });

  /*
   ** MANY.HQR contains 50,000 uncompressed entries
   ** of random sizes between 0 and 128 bytes.
   */
  it('should read a HQR file with many entries', async () => {
    const file = await readHQRFile('MANY.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    expect(hqr.entries.length).toBe(50000);
    const lengths = hqr.entries.map(entry => entry?.content.byteLength);
    expect(lengths.find(l => l === undefined || l < 0 || l >= 128)).toBe(
      undefined
    );
  });

  /*
   ** BLANKS.HQR contains some blank entries.
   */
  it('should read blank entries', async () => {
    const file = await readHQRFile('BLANKS.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    expect(hqr.entries.length).toBe(4);
    expect(hqr.entries[0]?.content.byteLength).toBe(128);
    expect(hqr.entries[1]).toBeNull();
    expect(hqr.entries[2]?.content.byteLength).toBe(128);
    expect(hqr.entries[3]).toBeNull();
  });

  /*
   ** BIG.HQR contains a single 4Mb entry.
   */
  it('should read a big HQR file', async () => {
    const file = await readHQRFile('BIG.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    expect(hqr.entries.length).toBe(1);
    expect(hqr.entries[0]?.content.byteLength).toBe(4000000);
  });
});
