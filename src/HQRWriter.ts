import { ENTRY_HEADER_SIZE } from './constants';
import HQR from './HQR';
import { CompressionType, HQREntryBase } from './types';

export interface WriteOptions {
  skipCompression: boolean; // Always skipping compression for now
}

const DEFAULT_OPTIONS: WriteOptions = {
  skipCompression: false,
};

export default class HQRWriter {
  readonly options: WriteOptions;
  readonly hqr: HQR;

  constructor(hqr: HQR, options: Partial<WriteOptions>) {
    this.hqr = hqr;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  write(): ArrayBuffer {
    const buffer = new ArrayBuffer(this.computeBufferSize());
    const entriesIndex = new Uint32Array(
      buffer,
      0,
      this.hqr.entries.length + 1
    );

    let offset = this.hqr.entries.length * 4 + 4;
    for (let i = 0; i < this.hqr.entries.length; i += 1) {
      const entry = this.hqr.entries[i];

      if (!entry) {
        /* Write blank entry */
        entriesIndex[i] = 0;
        continue;
      }

      entriesIndex[i] = offset;
      offset = this.writeEntry(buffer, offset, entry);
    }

    entriesIndex[this.hqr.entries.length] = buffer.byteLength;

    return buffer;
  }

  computeBufferSize(): number {
    const headerSize = this.hqr.entries.length * 4 + 4;
    const entrySize = this.hqr.entries.reduce((acc, entry) => {
      if (entry) {
        return acc + this.getEntrySize(entry);
      }
      return acc;
    }, 0);
    return headerSize + entrySize;
  }

  getEntrySize(entry: HQREntryBase): number {
    const hiddenEntriesSize = entry.next ? this.getEntrySize(entry.next) : 0;
    // TODO: Compute size of compressed entry here.
    // We're assuming that the entry is uncompressed for now.
    return ENTRY_HEADER_SIZE + entry.content.byteLength + hiddenEntriesSize;
  }

  writeEntry(buffer: ArrayBuffer, offset: number, entry: HQREntryBase): number {
    /* Write header */
    const entryHeaderView = new DataView(buffer, offset, ENTRY_HEADER_SIZE);
    entryHeaderView.setUint32(0, entry.content.byteLength, true); // Original size
    entryHeaderView.setUint32(4, entry.content.byteLength, true); // Compressed size
    entryHeaderView.setUint16(8, CompressionType.NONE, true); // Compression type: forced to NONE for now
    offset += ENTRY_HEADER_SIZE;

    /* Write content */
    const entryBuffer = new Uint8Array(
      buffer,
      offset,
      entry.content.byteLength
    );
    entryBuffer.set(new Uint8Array(entry.content));
    offset += entry.content.byteLength;

    /* Write associated hidden entries */
    if (entry.next) {
      offset = this.writeEntry(buffer, offset, entry.next);
    }

    return offset;
  }
}
