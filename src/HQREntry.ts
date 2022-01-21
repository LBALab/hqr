import { CompressionType, HQREntryBase } from './types';

export default class HQREntry implements HQREntryBase {
  type: CompressionType;
  content: ArrayBuffer;
  next?: HQREntry;

  constructor(content: ArrayBuffer, type: CompressionType) {
    this.content = content;
    this.type = type;
  }
}
