/* eslint-disable @typescript-eslint/no-non-null-assertion */
import fs from 'fs/promises';
import path from 'path';
import { CompressionType, HQR, HQREntry } from '../src';
import { decompressLZSS_LBA } from '../src/compression/LZSS_LBA';
import { compressLZSS_LBA_type_1 } from '../src/compression/LZSS_LBA_type_1';
import { compressLZSS_LBA_type_2 } from '../src/compression/LZSS_LBA_type_2';
import * as LZSS_LBA_type_1 from '../src/compression/LZSS_LBA_type_1';
import * as LZSS_LBA_type_2 from '../src/compression/LZSS_LBA_type_2';
import { readHQRFile } from './utils';

describe('Compression', () => {
  it('should read a file with compressed entries', async () => {
    const file = await readHQRFile('COMPRESSED.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    expect(hqr.entries.length).toBe(3);
    expect(hqr.entries[0]?.type).toBe(CompressionType.NONE);
    expect(hqr.entries[0]?.content.byteLength).toBe(128);
    expect(hqr.entries[1]?.type).toBe(CompressionType.LZSS_LBA_TYPE_1);
    expect(hqr.entries[1]?.content.byteLength).toBe(19116);
    expect(hqr.entries[2]?.type).toBe(CompressionType.LZSS_LBA_TYPE_2);
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

  it('should write a compressed HQR file, and read back the proper content', () => {
    const hqr = new HQR();
    const str = `Hello world!
    This is a test with a string that should be compressable.
    If it was too short it would not be compressable.
    But with this length, it should.`;
    hqr.entries.push(
      new HQREntry(new ArrayBuffer(512), CompressionType.LZSS_LBA_TYPE_1)
    );
    hqr.entries.push(
      new HQREntry(Buffer.from(str, 'utf-8'), CompressionType.LZSS_LBA_TYPE_2)
    );
    const numView = new DataView(new ArrayBuffer(4));
    numView.setUint32(0, 42, true);
    hqr.entries.push(
      new HQREntry(numView.buffer, CompressionType.LZSS_LBA_TYPE_1)
    );

    // Write file to buffer
    const compressedFile = hqr.toArrayBuffer();
    expect(compressedFile.byteLength).toBe(249);

    // Read back file buffer
    const hqr2 = HQR.fromArrayBuffer(compressedFile);
    expect(hqr2.entries.length).toBe(3);
    expect(hqr2.entries[0]?.type).toBe(CompressionType.LZSS_LBA_TYPE_1);
    expect(hqr2.entries[0]?.content.byteLength).toBe(512);
    expect(
      Buffer.from(hqr2.entries[0]!.content).compare(
        Buffer.from(hqr.entries[0]!.content)
      )
    ).toBe(0);
    expect(hqr2.entries[1]?.type).toBe(CompressionType.LZSS_LBA_TYPE_2);
    expect(hqr2.entries[1]?.content.byteLength).toBe(165);
    expect(Buffer.from(hqr2.entries[1]!.content).toString('utf-8')).toEqual(
      str
    );
    // Uncompressable entries are stored with CompressionType.NONE:
    expect(hqr2.entries[2]?.type).toBe(CompressionType.NONE);
    expect(hqr2.entries[2]?.content.byteLength).toBe(4);
    expect(new DataView(hqr2.entries[2]!.content).getUint32(0, true)).toBe(42);
  });

  it('should write a compressed HQR file, but skip compression', () => {
    const hqr = new HQR();
    const str = `Hello world!
    This is a test with a string that should be compressable.
    If it was too short it would not be compressable.
    But with this length, it should.`;
    hqr.entries.push(
      new HQREntry(new ArrayBuffer(512), CompressionType.LZSS_LBA_TYPE_1)
    );
    hqr.entries.push(
      new HQREntry(Buffer.from(str, 'utf-8'), CompressionType.LZSS_LBA_TYPE_1)
    );
    const numView = new DataView(new ArrayBuffer(4));
    numView.setUint32(0, 42, true);
    hqr.entries.push(
      new HQREntry(numView.buffer, CompressionType.LZSS_LBA_TYPE_1)
    );

    // Write file to buffer
    const compressedFile = hqr.toArrayBuffer({ skipCompression: true });
    expect(compressedFile.byteLength).toBe(727);

    // Read back file buffer
    const hqr2 = HQR.fromArrayBuffer(compressedFile);
    expect(hqr2.entries.length).toBe(3);
    expect(hqr2.entries[0]?.type).toBe(CompressionType.NONE);
    expect(hqr2.entries[0]?.content.byteLength).toBe(512);
    expect(
      Buffer.from(hqr2.entries[0]!.content).compare(
        Buffer.from(hqr.entries[0]!.content)
      )
    ).toBe(0);
    expect(hqr2.entries[1]?.type).toBe(CompressionType.NONE);
    expect(hqr2.entries[1]?.content.byteLength).toBe(165);
    expect(Buffer.from(hqr2.entries[1]!.content).toString('utf-8')).toEqual(
      str
    );
    // Uncompressable entries are stored with CompressionType.NONE:
    expect(hqr2.entries[2]?.type).toBe(CompressionType.NONE);
    expect(hqr2.entries[2]?.content.byteLength).toBe(4);
    expect(new DataView(hqr2.entries[2]!.content).getUint32(0, true)).toBe(42);
  });

  it('should read a file with compressed entries and fast recompile it', async () => {
    const compressLZSS_LBA_t1_mock = jest.spyOn(
      LZSS_LBA_type_1,
      'compressLZSS_LBA_type_1'
    );
    const compressLZSS_LBA_t2_mock = jest.spyOn(
      LZSS_LBA_type_2,
      'compressLZSS_LBA_type_2'
    );
    const file = await readHQRFile('COMPRESSED.HQR');
    const hqr = HQR.fromArrayBuffer(file.buffer);
    const compressedFile = hqr.toArrayBuffer({ fastRecompile: true });
    expect(compressedFile.byteLength).toBe(file.byteLength);
    expect(file.compare(Buffer.from(compressedFile))).toBe(0);
    expect(compressLZSS_LBA_t1_mock).toHaveBeenCalledTimes(0);
    expect(compressLZSS_LBA_t2_mock).toHaveBeenCalledTimes(0);
    compressLZSS_LBA_t1_mock.mockClear();
    compressLZSS_LBA_t2_mock.mockClear();
  });

  testCompressionAlgorithm(
    compressLZSS_LBA_type_1,
    CompressionType.LZSS_LBA_TYPE_1
  );

  testCompressionAlgorithm(
    compressLZSS_LBA_type_2,
    CompressionType.LZSS_LBA_TYPE_2
  );
});

function testCompressionAlgorithm(
  compressor: (data: ArrayBuffer) => ArrayBuffer,
  compressionType: CompressionType
) {
  describe(`LZSS-LBA type ${compressionType}`, () => {
    it('should compress big 5Mb empty buffer', () => {
      const buffer = new ArrayBuffer(5000000);
      const compressed = compressor(buffer);
      expect(compressed.byteLength).toBeLessThan(buffer.byteLength);
      const decomp = decompressLZSS_LBA(
        compressed,
        buffer.byteLength,
        compressionType
      );
      expect(decomp.byteLength).toStrictEqual(buffer.byteLength);
      expect(Buffer.from(decomp).compare(Buffer.from(buffer))).toBe(0);
    });

    for (let i = 1; i <= 3; i++) {
      const lorem = `lorem${i}.txt`;
      it(`should compress ${lorem} and uncompress to the same result`, async () => {
        const file = await fs.readFile(path.join(__dirname, `./data/${lorem}`));
        const compressed = compressor(file.buffer);
        expect(compressed.byteLength).toBeLessThan(file.byteLength);
        const decomp = decompressLZSS_LBA(
          compressed,
          file.byteLength,
          compressionType
        );
        expect(decomp.byteLength).toStrictEqual(file.byteLength);
        expect(Buffer.from(decomp).compare(file)).toBe(0);
      });
    }

    const sizes = [0, 1, 2, 4, 8];
    for (const size of sizes) {
      it(`should compress ${size}-sized random buffer`, () => {
        const buffer = new ArrayBuffer(size);
        const ui8 = new Uint8Array(buffer);
        for (let i = 0; i < size; i++) {
          ui8[i] = 128 + Math.random() * 16;
        }
        const compressed = compressor(buffer);
        expect(compressed.byteLength).toBeLessThanOrEqual(buffer.byteLength);
        const decomp = decompressLZSS_LBA(
          compressed,
          buffer.byteLength,
          compressionType
        );
        expect(decomp.byteLength).toStrictEqual(buffer.byteLength);
        expect(Buffer.from(decomp).compare(Buffer.from(buffer))).toBe(0);
      });
    }

    for (let i = 0; i < 5; i++) {
      const buffer = new Uint8Array(
        new ArrayBuffer(Math.floor(Math.random() * 100000) + 1)
      );
      const numIterations = Math.floor(Math.random() * 10000) + 100;
      for (let j = 0; j < numIterations; j++) {
        const length = Math.floor(Math.random() * 500);
        const data = new Uint8Array(new ArrayBuffer(length));
        let acc = 0;
        let value = 0;
        const minLen = Math.random() * 20;
        const lenAmplitude = Math.random() * 100;
        for (let k = 0; k < length; k++) {
          if (acc <= 0) {
            acc = Math.random() * lenAmplitude + minLen;
            value = Math.random() * 255;
          }
          data[k] = value;
          acc--;
        }
        const numIter2 = Math.floor(Math.random() * 10) + 1;
        for (let j = 0; j < numIter2; j++) {
          const offset = Math.floor(Math.random() * buffer.byteLength);
          for (let k = 0; k < data.length; k++) {
            if (offset + k >= buffer.byteLength) {
              break;
            }
            buffer[offset + k] = data[k];
          }
        }
      }
      it(`should compress buffer #${i} of random size ${buffer.byteLength}`, () => {
        const compressed = compressor(buffer);
        expect(compressed.byteLength).toBeLessThanOrEqual(buffer.byteLength);
        const decomp = decompressLZSS_LBA(
          compressed,
          buffer.byteLength,
          compressionType
        );
        expect(decomp.byteLength).toStrictEqual(buffer.byteLength);
        expect(Buffer.from(decomp).compare(Buffer.from(buffer))).toBe(0);
      });
    }

    const rareCases = [
      'early-exit-A',
      'early-exit-B',
      'early-exit-C',
      'count_bits',
    ];
    for (const rareCase of rareCases) {
      it(`should compress corner case: ${rareCase}`, async () => {
        const file = await fs.readFile(
          path.join(__dirname, `./data/${rareCase}.bin`)
        );
        const compressed = compressor(file.buffer);
        expect(compressed.byteLength).toBeLessThanOrEqual(file.byteLength);
        const decomp = decompressLZSS_LBA(
          compressed,
          file.byteLength,
          compressionType
        );
        expect(decomp.byteLength).toStrictEqual(file.byteLength);
        expect(Buffer.from(decomp).compare(file)).toBe(0);
      });
    }
  });
}
