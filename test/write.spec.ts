import { HQR, HQREntry } from '../src';
import { binaryCompare } from './utils';
import { CompressionType } from '../src/types';

describe('Write HQR files', () => {
  it('should write a binary equivalent of SIMPLE.HQR', async () => {
    const hqr = new HQR();
    const str = 'Hello world!';
    hqr.entries.push(new HQREntry(new ArrayBuffer(512), CompressionType.NONE));
    hqr.entries.push(
      new HQREntry(Buffer.from(str, 'utf-8'), CompressionType.NONE)
    );
    const numView = new DataView(new ArrayBuffer(4));
    numView.setUint32(0, 42, true);
    hqr.entries.push(new HQREntry(numView.buffer, CompressionType.NONE));

    await binaryCompare(hqr, 'SIMPLE.HQR');
  });

  it('should write a binary equivalent of BLANKS.HQR', async () => {
    const hqr = new HQR();
    hqr.entries.push(new HQREntry(new ArrayBuffer(128), CompressionType.NONE));
    hqr.entries.push(null);
    hqr.entries.push(new HQREntry(new ArrayBuffer(128), CompressionType.NONE));
    hqr.entries.push(null);

    await binaryCompare(hqr, 'BLANKS.HQR');
  });
});
