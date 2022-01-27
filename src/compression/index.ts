import { ENTRY_HEADER_SIZE } from '../constants';
import { EntryInfo } from '../HQRReader';
import { CompressionType } from '../types';
import { decompressLZSS_LBA } from './LZSS_LBA';

export function decodeEntry(buffer: ArrayBuffer, info: EntryInfo): ArrayBuffer {
  const entryBuffer = buffer.slice(
    info.offset + ENTRY_HEADER_SIZE,
    info.offset + ENTRY_HEADER_SIZE + info.compressedSize
  );
  switch (info.type) {
    case CompressionType.NONE:
      return entryBuffer;
    case CompressionType.LZSS_LBA_TYPE_1:
    case CompressionType.LZSS_LBA_TYPE_2:
      return decompressLZSS_LBA(entryBuffer, info.originalSize, info.type);
    default:
      throw new Error(`Unknown compression type: ${info.type as number}`);
  }
}
