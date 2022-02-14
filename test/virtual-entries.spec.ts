/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { CompressionType, HQR, HQREntry, HQRVirtualEntry } from '../src';
import { binaryCompare, readHQRFile } from './utils';

describe('Virtual entries', () => {
  it('should find virtual entries in VIRTUAL.HQR', async () => {
    const file = await readHQRFile('VIRTUAL.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);

    const virtual = hqr.entries.filter(
      entry => entry && entry instanceof HQRVirtualEntry
    ) as HQRVirtualEntry[];
    expect(virtual.length).toBe(100);
  });

  it('should find expected virtual entries content in VIRTUAL2.HQR', async () => {
    const file = await readHQRFile('VIRTUAL2.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);

    expect(hqr.entries[0]?.type).toBe(CompressionType.NONE);
    expect(hqr.entries[0]?.content.byteLength).toBe(25);
    expect(hqr.entries[1]?.type).toBe(CompressionType.NONE);
    expect(hqr.entries[1]?.content.byteLength).toBe(25);
    expect(
      Buffer.from(hqr.entries[0]!.content).compare(
        Buffer.from(hqr.entries[1]!.content)
      )
    ).toBe(0);
    expect(hqr.entries[2]?.type).toBe(CompressionType.LZSS_LBA_TYPE_1);
    expect(hqr.entries[2]?.content.byteLength).toBe(512);
    expect(hqr.entries[3]?.type).toBe(CompressionType.LZSS_LBA_TYPE_1);
    expect(hqr.entries[3]?.content.byteLength).toBe(512);
    expect(
      Buffer.from(hqr.entries[2]!.content).compare(
        Buffer.from(hqr.entries[3]!.content)
      )
    ).toBe(0);
  });

  it('should recompress VIRTUAL.HQR and result in the same file', async () => {
    const file = await readHQRFile('VIRTUAL.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);

    const compressedFile = hqr.toArrayBuffer({ fastRecompile: true });
    expect(compressedFile.byteLength).toBe(file.byteLength);
    expect(file.compare(Buffer.from(compressedFile))).toBe(0);
  });

  it('should write a binary equivalent of VIRTUAL.HQR', async () => {
    const hqr = new HQR();
    hqr.entries.push(new HQREntry(new ArrayBuffer(512), CompressionType.NONE));
    for (let i = 0; i < 100; i += 1) {
      hqr.entries.push(new HQRVirtualEntry(hqr, 0, {}));
    }

    await binaryCompare(hqr, 'VIRTUAL.HQR');
  });

  it('should write a binary equivalent of VIRTUAL2.HQR', async () => {
    const file = await readHQRFile('VIRTUAL2.HQR');
    const original = HQR.fromArrayBuffer(file.buffer);

    const hqr = new HQR();
    hqr.entries.push(
      new HQREntry(original.entries[0]!.content, CompressionType.NONE)
    );
    hqr.entries.push(new HQRVirtualEntry(hqr, 0, {}));
    hqr.entries.push(
      new HQREntry(
        original.entries[2]!.content,
        CompressionType.LZSS_LBA_TYPE_1
      )
    );
    hqr.entries.push(new HQRVirtualEntry(hqr, 2, {}));

    await binaryCompare(hqr, 'VIRTUAL2.HQR');
  });

  it('should not read intermediate entries as hidden entries when reading virtual entries', async () => {
    const file = await readHQRFile('VIRTUAL3.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);

    expect(hqr.entries.length).toBe(5);
    expect(hqr.entries[0]?.content.byteLength).toBe(512);
    expect(hqr.entries[1]?.content.byteLength).toBe(16);
    expect(hqr.entries[2]?.content.byteLength).toBe(24);
    expect(hqr.entries[3]?.content.byteLength).toBe(54);
    expect(hqr.entries[4]?.content.byteLength).toBe(512);

    expect(hqr.entries[4]).toBeInstanceOf(HQRVirtualEntry);
    expect(hqr.entries[4]?.hiddenEntries.length).toBe(0);
  });

  it('should treat invalid virtual entries as blank entries, and display warnings', () => {
    const consoleWarnMock = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {
        // do nothing
      });
    const hqr = new HQR();
    hqr.entries.push(new HQREntry(new ArrayBuffer(12), CompressionType.NONE));
    hqr.entries.push(null);
    hqr.entries.push(new HQRVirtualEntry(hqr, -1, {}));
    hqr.entries.push(new HQRVirtualEntry(hqr, 1, {}));
    hqr.entries.push(new HQRVirtualEntry(hqr, 12, {}));

    const buffer = hqr.toArrayBuffer();
    expect(consoleWarnMock.mock.calls).toEqual([
      ['Found invalid virtual entry at index 2'],
      ['Found invalid virtual entry at index 3'],
      ['Found invalid virtual entry at index 4'],
    ]);
    consoleWarnMock.mockRestore();

    const hqr2 = HQR.fromArrayBuffer(buffer);
    expect(hqr2.entries.length).toBe(5);
    expect(hqr2.entries[0]?.content.byteLength).toBe(12);
    expect(hqr2.entries[1]).toBe(null);
    expect(hqr2.entries[2]).toBe(null);
    expect(hqr2.entries[3]).toBe(null);
    expect(hqr2.entries[4]).toBe(null);
  });

  it('should throw errors when trying to read invalid entries', () => {
    const hqr = new HQR();
    hqr.entries.push(new HQREntry(new ArrayBuffer(12), CompressionType.NONE));
    hqr.entries.push(null);
    hqr.entries.push(new HQRVirtualEntry(hqr, 1, {}));
    hqr.entries.push(new HQRVirtualEntry(hqr, -1, {}));
    hqr.entries.push(new HQRVirtualEntry(hqr, 6, {}));
    hqr.entries.push(new HQRVirtualEntry(hqr, 5, {}));

    expect(() => hqr.entries[2]?.content.byteLength).toThrow(
      'Target entry is blank'
    );
    expect(() => hqr.entries[3]?.content.byteLength).toThrow(
      'Target entry index out of bounds'
    );
    expect(() => hqr.entries[4]?.content.byteLength).toThrow(
      'Target entry index out of bounds'
    );
    expect(() => hqr.entries[5]?.content.byteLength).toThrow(
      'Target entry is a virtual entry'
    );
  });
});
