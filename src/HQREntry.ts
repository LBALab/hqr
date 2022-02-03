import { CompressionType, HQREntryBase, HQREntryMetadata } from './types';

export default class HQREntry implements HQREntryBase {
  type: CompressionType;
  content: ArrayBuffer;
  readonly metadata: HQREntryMetadata;
  readonly hiddenEntries: HQREntryBase[] = [];

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
