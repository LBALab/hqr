export enum CompressionType {
  NONE = 0,
  LZSS_LBA_TYPE_1 = 1,
  LZSS_LBA_TYPE_2 = 2,
}

export interface HQREntryMetadata extends Record<string, any> {
  compressedSize?: number;
  compressedBuffer?: ArrayBuffer;
}

export interface HQREntryBase {
  type: CompressionType;
  content: ArrayBuffer;
  next?: HQREntryBase;
  readonly metadata: HQREntryMetadata;
}
