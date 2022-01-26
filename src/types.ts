export enum CompressionType {
  NONE = 0,
  LZMIT_TYPE_1 = 1,
  LZMIT_TYPE_2 = 2,
}

export interface HQREntryMetadata extends Record<string, any> {
  compressedSize?: number;
}

export interface HQREntryBase {
  type: CompressionType;
  content: ArrayBuffer;
  next?: HQREntryBase;
  readonly metadata: HQREntryMetadata;
}
