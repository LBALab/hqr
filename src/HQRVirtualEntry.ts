import HQR from './HQR';
import { CompressionType, HQREntryBase, HQREntryMetadata } from './types';

/*
 ** A virtual entry is an entry that points to another entry in the HQR.
 ** This class is meant to be used internally by the reader for handling
 ** entries that point to the same offset as another entry.
 */
export default class HQRVirtualEntry implements HQREntryBase {
  readonly hqr: HQR;
  readonly target: number;
  readonly metadata: HQREntryMetadata;
  readonly hiddenEntries: HQREntryBase[] = [];

  constructor(hqr: HQR, target: number, metadata: HQREntryMetadata) {
    this.hqr = hqr;
    this.target = target;
    this.metadata = metadata;
  }

  isValid() {
    return (
      this.target >= 0 &&
      this.target < this.hqr.entries.length &&
      this.hqr.entries[this.target] !== null
    );
  }

  get targetEntry(): HQREntryBase {
    if (this.target < 0 || this.target >= this.hqr.entries.length) {
      throw new Error('Target entry index out of bounds');
    }
    const targetEntry = this.hqr.entries[this.target];
    if (targetEntry === null) {
      throw new Error('Target entry is blank');
    }
    if (targetEntry instanceof HQRVirtualEntry) {
      throw new Error('Target entry is a virtual entry');
    }
    return targetEntry;
  }

  get content(): ArrayBuffer {
    return this.targetEntry.content;
  }

  get type(): CompressionType {
    return this.targetEntry.type;
  }
}
