import { compressLZSS_LBA_type_1 } from './compression/LZSS_LBA_type_1';
import { compressLZSS_LBA_type_2 } from './compression/LZSS_LBA_type_2';
import { ENTRY_HEADER_SIZE } from './constants';
import HQR from './HQR';
import HQRLazyEntry from './HQRLazyEntry';
import HQRVirtualEntry from './HQRVirtualEntry';
import { CompressionType, HQREntryBase } from './types';

export interface WriteOptions {
  skipCompression: boolean;
  /**
   * This just copies the compressed entries from
   * the source HQR if they are not modified.
   * Modifications are marked with the `replacement`
   * property in the metadata.
   */
  fastRecompile: boolean;
}

const DEFAULT_OPTIONS: WriteOptions = {
  skipCompression: false,
  fastRecompile: false,
};

export default class HQRWriter {
  readonly options: WriteOptions;
  readonly hqr: HQR;

  constructor(hqr: HQR, options: Partial<WriteOptions>) {
    this.hqr = hqr;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  write(): ArrayBuffer {
    for (const entry of this.hqr.entries) {
      if (entry) {
        this.compressEntry(entry);
      }
    }
    const buffer = new ArrayBuffer(this.computeBufferSize());
    const entriesIndex = new Uint32Array(
      buffer,
      0,
      this.hqr.entries.length + 1
    );
    // [virtualEntryIndex, targetIndex]
    const virtualEntries: [number, number][] = [];

    let offset = this.hqr.entries.length * 4 + 4;
    for (let i = 0; i < this.hqr.entries.length; i += 1) {
      const entry = this.hqr.entries[i];

      if (!entry) {
        /* Write blank entry */
        entriesIndex[i] = 0;
        continue;
      }

      if (entry instanceof HQRVirtualEntry) {
        if (entry.isValid()) {
          virtualEntries.push([i, entry.target]);
        } else {
          console.warn(`Found invalid virtual entry at index ${i}`);
          entriesIndex[i] = 0;
        }
        continue;
      }

      entriesIndex[i] = offset;
      offset = this.writeEntry(buffer, offset, entry);
    }

    for (const [virtualEntryIndex, tgtIndex] of virtualEntries) {
      entriesIndex[virtualEntryIndex] = entriesIndex[tgtIndex];
    }

    entriesIndex[this.hqr.entries.length] = buffer.byteLength;

    for (const entry of this.hqr.entries) {
      if (entry) {
        this.cleanupEntry(entry);
      }
    }

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
    if (entry instanceof HQRVirtualEntry) {
      return 0;
    }

    let hiddenEntriesSize = 0;
    for (const hiddenEntry of entry.hiddenEntries) {
      hiddenEntriesSize += this.getEntrySize(hiddenEntry);
    }
    // TODO: Compute size of compressed entry here.
    // We're assuming that the entry is uncompressed for now.
    const contentSize = entry.metadata.compressedBuffer
      ? entry.metadata.compressedBuffer.byteLength
      : entry.content.byteLength;
    return ENTRY_HEADER_SIZE + contentSize + hiddenEntriesSize;
  }

  compressEntry(entry: HQREntryBase) {
    if (entry instanceof HQRVirtualEntry) {
      return;
    }

    if (this.options.skipCompression) {
      return;
    }

    if (
      // Compress type 2 as type 1 for now:
      entry.type === CompressionType.LZSS_LBA_TYPE_1 ||
      entry.type === CompressionType.LZSS_LBA_TYPE_2
    ) {
      const copyCompressedBuffer =
        this.options.fastRecompile &&
        entry instanceof HQRLazyEntry &&
        !entry.metadata.replacement;

      if (copyCompressedBuffer) {
        entry.metadata.compressedBuffer = entry.compressedContent;
      } else {
        let compressFunc;
        switch (entry.type) {
          case CompressionType.LZSS_LBA_TYPE_1:
            compressFunc = compressLZSS_LBA_type_1;
            break;
          case CompressionType.LZSS_LBA_TYPE_2:
            compressFunc = compressLZSS_LBA_type_2;
            break;
        }
        const compressedBuffer = compressFunc(entry.content);
        if (compressedBuffer.byteLength < entry.content.byteLength) {
          entry.metadata.compressedBuffer = compressedBuffer;
        }
      }
    }

    for (const hiddenEntry of entry.hiddenEntries) {
      this.compressEntry(hiddenEntry);
    }
  }

  cleanupEntry(entry: HQREntryBase): HQREntryBase {
    if (entry.metadata.compressedBuffer) {
      delete entry.metadata.compressedBuffer;
    }
    for (const hiddenEntry of entry.hiddenEntries) {
      this.cleanupEntry(hiddenEntry);
    }
    return entry;
  }

  writeEntry(buffer: ArrayBuffer, offset: number, entry: HQREntryBase): number {
    const entryContentCompressed = entry.metadata.compressedBuffer
      ? entry.metadata.compressedBuffer
      : entry.content;

    /* Write header */
    const entryHeaderView = new DataView(buffer, offset, ENTRY_HEADER_SIZE);
    let type = CompressionType.NONE;
    if (entry.metadata.compressedBuffer) {
      type = entry.type;
    }
    entryHeaderView.setUint32(0, entry.content.byteLength, true); // Original size
    entryHeaderView.setUint32(4, entryContentCompressed.byteLength, true); // Compressed size
    entryHeaderView.setUint16(8, type, true);
    offset += ENTRY_HEADER_SIZE;

    /* Write content */
    const entrySlice = new Uint8Array(
      buffer,
      offset,
      entryContentCompressed.byteLength
    );
    entrySlice.set(new Uint8Array(entryContentCompressed));
    offset += entryContentCompressed.byteLength;

    /* Write associated hidden entries */
    for (const hiddenEntry of entry.hiddenEntries) {
      offset = this.writeEntry(buffer, offset, hiddenEntry);
    }

    return offset;
  }
}
