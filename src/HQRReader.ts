import HQR from './HQR';
import { ENTRY_HEADER_SIZE } from './constants';
import { CompressionType, HQREntryBase } from './types';
import HQREntry from './HQREntry';
import HQRLazyEntry from './HQRLazyEntry';
import { decodeEntry } from './compression';
import HQRVirtualEntry from './HQRVirtualEntry';
import { HQREntryMetadata } from '.';

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

  private maxOffset = -1;
  private numEntries: number;
  private entriesIndex: Uint32Array;

  constructor(buffer: ArrayBuffer, options: Partial<ReadOptions>) {
    this.buffer = buffer;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    const firstOffset = new DataView(this.buffer, 0, 4).getUint32(0, true);

    this.numEntries = firstOffset / 4 - 1;
    this.entriesIndex = new Uint32Array(this.buffer, 0, this.numEntries + 1);
  }

  read(): HQR {
    const hqr = new HQR();

    this.maxOffset = -1;

    for (let i = 0; i < this.numEntries; i += 1) {
      if (this.entriesIndex[i] === 0) {
        /* Read blank entry as null */
        hqr.entries.push(null);
        continue;
      }

      /* Read entry */
      const entryInfo = this.readEntryInfo(this.entriesIndex[i]);
      const entry = this.readEntry(hqr, entryInfo);
      hqr.entries.push(entry);

      if (entry instanceof HQRVirtualEntry) {
        /* Duplicate entries don't have hidden entries */
        continue;
      }

      /* Read associated hidden entries */
      let nextOffset = 0;
      /* search for next non empty entry */
      for (let j = i + 1; !nextOffset && j < this.numEntries; j += 1) {
        nextOffset = this.entriesIndex[j];
      }
      /* when entry is the latest non empty, use HQR size as nextOffset */
      if (!nextOffset) {
        nextOffset = this.buffer.byteLength;
      }
      let computedOffset = this.computeNextOffset(entryInfo);
      while (computedOffset < nextOffset) {
        const hiddenEntryInfo = this.readEntryInfo(computedOffset);
        const hiddenEntry = this.readEntry(hqr, hiddenEntryInfo);
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

  private readEntry(hqr: HQR, entryInfo: EntryInfo): HQREntryBase {
    const metadata: HQREntryMetadata = {
      offset: entryInfo.offset,
      originalSize: entryInfo.originalSize,
      compressedSize: entryInfo.compressedSize,
      virtual: false,
    };

    if (entryInfo.offset <= this.maxOffset) {
      const index = this.entriesIndex.findIndex(
        offset => entryInfo.offset === offset
      );
      metadata.virtual = true;
      metadata.target = index;
      return new HQRVirtualEntry(hqr, index, metadata);
    }

    this.maxOffset = Math.max(this.maxOffset, entryInfo.offset);

    if (this.options.lazyLoad) {
      return new HQRLazyEntry(this.buffer, entryInfo, metadata);
    }

    const content = decodeEntry(this.buffer, entryInfo);
    return new HQREntry(content, entryInfo.type, metadata);
  }
}
