import { HQR } from '../src';
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
      ['0: type=0 size=512'],
      ['1: type=0 size=12'],
      ['2: type=0 size=4'],
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
      ['0: type=0 size=32'],
      ['1: type=0 size=512'],
      ['  1.0(hidden): type=0 size=454'],
      ['  1.1(hidden): type=0 size=12'],
      ['2: type=0 size=64'],
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
      ['0: type=0 size=128'],
      ['1: type=1 size=19116'],
      ['2: type=2 size=2426'],
    ]);
    consoleLogMock.mockRestore();
  });
});
