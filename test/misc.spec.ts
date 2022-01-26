import { CompressionType, HQR, HQREntry } from '../src';
import { readHQRFile } from './utils';

describe('Misc features', () => {
  it('should test the dump() method', async () => {
    const consoleLogMock = jest.spyOn(console, 'log').mockImplementation(() => {
      // do nothing
    });
    const file = await readHQRFile('SIMPLE.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    hqr.dump();
    expect(consoleLogMock.mock.calls).toEqual([
      ['0: type=0 size=512 compressed=512'],
      ['1: type=0 size=12 compressed=12'],
      ['2: type=0 size=4 compressed=4'],
    ]);
    consoleLogMock.mockRestore();
  });

  it('should test the dump() method with hidden entries', async () => {
    const consoleLogMock = jest.spyOn(console, 'log').mockImplementation(() => {
      // do nothing
    });
    const file = await readHQRFile('HIDDEN.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    hqr.dump();
    expect(consoleLogMock.mock.calls).toEqual([
      ['0: type=0 size=32 compressed=32'],
      ['1: type=0 size=512 compressed=512'],
      ['  1.0(hidden): type=0 size=454 compressed=454'],
      ['  1.1(hidden): type=0 size=12 compressed=12'],
      ['2: type=0 size=64 compressed=64'],
    ]);
    consoleLogMock.mockRestore();
  });

  it('should test the dump() method with compressed entries', async () => {
    const consoleLogMock = jest.spyOn(console, 'log').mockImplementation(() => {
      // do nothing
    });
    const file = await readHQRFile('COMPRESSED.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    hqr.dump();
    expect(consoleLogMock.mock.calls).toEqual([
      ['0: type=0 size=128 compressed=128'],
      ['1: type=1 size=19116 compressed=7223'],
      ['2: type=2 size=2426 compressed=1633'],
    ]);
    consoleLogMock.mockRestore();
  });

  it('should test the dump() method with blank entries', async () => {
    const consoleLogMock = jest.spyOn(console, 'log').mockImplementation(() => {
      // do nothing
    });
    const file = await readHQRFile('BLANKS.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    hqr.dump();
    expect(consoleLogMock.mock.calls).toEqual([
      ['0: type=0 size=128 compressed=128'],
      ['1: blank'],
      ['2: type=0 size=128 compressed=128'],
      ['3: blank'],
    ]);
    consoleLogMock.mockRestore();
  });

  it('should test the dump() method with a generated HQR', () => {
    const consoleLogMock = jest.spyOn(console, 'log').mockImplementation(() => {
      // do nothing
    });
    const hqr = new HQR();
    hqr.entries.push(new HQREntry(new ArrayBuffer(12), CompressionType.NONE));
    hqr.entries.push(new HQREntry(new ArrayBuffer(128), CompressionType.NONE));
    const last = new HQREntry(new ArrayBuffer(64), CompressionType.NONE);
    hqr.entries.push(last);
    last.next = new HQREntry(new ArrayBuffer(8), CompressionType.NONE);
    hqr.dump();
    expect(consoleLogMock.mock.calls).toEqual([
      ['0: type=0 size=12 compressed=?'],
      ['1: type=0 size=128 compressed=?'],
      ['2: type=0 size=64 compressed=?'],
      ['  2.0(hidden): type=0 size=8 compressed=?'],
    ]);
    consoleLogMock.mockRestore();
  });
});
