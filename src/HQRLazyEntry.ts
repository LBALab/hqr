import { decodeEntry } from './compression';
import { EntryInfo } from './HQRReader';
import { CompressionType, HQREntryBase, HQREntryMetadata } from './types';

/*
 ** A HQRLazyEntry is an entry that can be decoded on demand,
 ** as opposed to an HQREntry that needs to be decoded at
 ** the time of creation.
 ** This class is not meant to be instanciated directly,
 ** but rather through HQRReader.readEntry()
 */
export default class HQRLazyEntry implements HQREntryBase {
  private readonly buffer: ArrayBuffer;
  private readonly info: EntryInfo;
  private _content?: ArrayBuffer;
  next?: HQRLazyEntry;
  readonly metadata: HQREntryMetadata = {};

  get content(): ArrayBuffer {
    if (!this._content) {
      this._content = decodeEntry(this.buffer, this.info);
    }
    return this._content;
  }

  get type(): CompressionType {
    return this.info.type;
  }

  constructor(
    buffer: ArrayBuffer,
    info: EntryInfo,
    metadata: HQREntryMetadata
  ) {
    this.buffer = buffer;
    this.info = info;
    this.metadata = metadata;
  }
}
