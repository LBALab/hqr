import HQR from './HQR';
import { ENTRY_HEADER_SIZE } from './constants';
import { CompressionType, HQREntryBase } from './types';
import HQREntry from './HQREntry';
import HQRLazyEntry from './HQRLazyEntry';
import { decodeEntry } from './compression';

export interface EntryInfo {
  type: CompressionType;
  offset: number;
  originalSize: number;
  compressedSize: number;
  nextHiddenEntry?: EntryInfo;
}

export interface ReadOptions {
  lazyLoad: boolean;
}

const DEFAULT_OPTIONS: ReadOptions = {
  lazyLoad: true,
};

export default class HQRReader {
  readonly buffer: ArrayBuffer;
  readonly options: ReadOptions;

  constructor(buffer: ArrayBuffer, options: Partial<ReadOptions>) {
    this.buffer = buffer;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  read(): HQR {
    const hqr = new HQR();

    const firstOffset = new DataView(this.buffer, 0, 4).getUint32(0, true);
    const numEntries = firstOffset / 4 - 1;
    const entriesIndex = new Uint32Array(this.buffer, 0, numEntries + 1);

    for (let i = 0; i < numEntries; i += 1) {
      if (entriesIndex[i] === 0) {
        /* Read blank entry as null */
        hqr.entries.push(null);
        continue;
      }

      /* Read entry */
      const entryInfo = this.readEntryInfo(entriesIndex[i]);
      const entry = this.readEntry(entryInfo);
      hqr.entries.push(entry);

      /* Read associated hidden entries */
      const nextOffset = entriesIndex[i + 1];
      let computedOffset = this.computeNextOffset(entryInfo);
      while (computedOffset < nextOffset) {
        const hiddenEntryInfo = this.readEntryInfo(computedOffset);
        const hiddenEntry = this.readEntry(hiddenEntryInfo);
        entry.hiddenEntries.push(hiddenEntry);
        computedOffset = this.computeNextOffset(hiddenEntryInfo);
      }
    }
    return hqr;
  }

  private computeNextOffset(entryInfo: EntryInfo) {
    return entryInfo.offset + ENTRY_HEADER_SIZE + entryInfo.compressedSize;
  }

  private readEntryInfo(offset: number): EntryInfo {
    const header = new DataView(this.buffer, offset, 10);
    return {
      offset,
      originalSize: header.getUint32(0, true),
      compressedSize: header.getUint32(4, true),
      type: header.getUint16(8, true),
    };
  }

  private readEntry(entryInfo: EntryInfo): HQREntryBase {
    const metadata = {
      offset: entryInfo.offset,
      originalSize: entryInfo.originalSize,
      compressedSize: entryInfo.compressedSize,
    };
    if (this.options.lazyLoad) {
      return new HQRLazyEntry(this.buffer, entryInfo, metadata);
    }

    const content = decodeEntry(this.buffer, entryInfo);
    return new HQREntry(content, entryInfo.type, metadata);
  }
}
