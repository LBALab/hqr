import { CompressionType, HQR } from '../src';
import { readHQRFile } from './utils';

describe('Compression', () => {
  it('should read a file with compressed entries', async () => {
    const file = await readHQRFile('COMPRESSED.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    expect(hqr.entries.length).toBe(3);
    expect(hqr.entries[0]?.type).toBe(CompressionType.NONE);
    expect(hqr.entries[0]?.content.byteLength).toBe(128);
    expect(hqr.entries[1]?.type).toBe(CompressionType.LZMIT_TYPE_1);
    expect(hqr.entries[1]?.content.byteLength).toBe(19116);
    expect(hqr.entries[2]?.type).toBe(CompressionType.LZMIT_TYPE_2);
    expect(hqr.entries[2]?.content.byteLength).toBe(2426);
  });

  /* INVALID.HQR contains a single entry with compression type = 3,
   ** which is not supported by the library at this point.
   ** Maybe we'll support extensions for adding more compression types in the future.
   */
  it('should throw an exception on invalid HQR compression type', async () => {
    const file = await readHQRFile('INVALID.HQR');
    expect(() => HQR.fromArrayBuffer(file.buffer, { lazyLoad: false })).toThrow(
      'Unknown compression type: 3'
    );
  });
});
