import { CompressionType, HQREntryBase, HQREntryMetadata } from './types';

export default class HQREntry implements HQREntryBase {
  type: CompressionType;
  content: ArrayBuffer;
  next?: HQREntry;
  readonly metadata: HQREntryMetadata;

  constructor(
    content: ArrayBuffer,
    type: CompressionType,
    metadata: HQREntryMetadata = {}
  ) {
    this.content = content;
    this.type = type;
    this.metadata = metadata;
  }
}
