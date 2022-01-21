import { ENTRY_HEADER_SIZE } from '../constants';
import { EntryInfo } from '../HQRReader';
import { CompressionType } from '../types';
import * as LZMIT from './LZMIT';

export function decodeEntry(buffer: ArrayBuffer, info: EntryInfo): ArrayBuffer {
  switch (info.type) {
    case CompressionType.NONE:
      return buffer.slice(
        info.offset + ENTRY_HEADER_SIZE,
        info.offset + ENTRY_HEADER_SIZE + info.compressedSize
      );
    case CompressionType.LZMIT_TYPE_1:
    case CompressionType.LZMIT_TYPE_2:
      return LZMIT.decode(buffer, info);
    default:
      throw new Error(`Unknown compression type: ${info.type as number}`);
  }
}
