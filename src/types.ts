export enum CompressionType {
  NONE = 0,
  LZSS_LBA_TYPE_1 = 1,
  LZSS_LBA_TYPE_2 = 2,
}

export interface HQREntryMetadata extends Record<string, any> {
  offset?: number;
  originalSize?: number;
  compressedSize?: number;
  compressedBuffer?: ArrayBuffer;
  replacement?: string;
  virtual?: boolean;
  target?: number;
}

export interface HQREntryBase {
  type: CompressionType;
  content: ArrayBuffer;
  readonly hiddenEntries: HQREntryBase[];
  readonly metadata: HQREntryMetadata;
}

export type HQREntryElement = HQREntryBase | null;
