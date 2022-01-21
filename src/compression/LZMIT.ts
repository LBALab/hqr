import { ENTRY_HEADER_SIZE } from '../constants';
import { EntryInfo } from '../HQRReader';

export function decode(buffer: ArrayBuffer, info: EntryInfo): ArrayBuffer {
  const tgt_buffer = new ArrayBuffer(info.originalSize);
  const source = new Uint8Array(
    buffer,
    info.offset + ENTRY_HEADER_SIZE,
    info.compressedSize
  );
  const target = new Uint8Array(tgt_buffer);
  let src_pos = 0;
  let tgt_pos = 0;
  while (src_pos + 1 <= info.compressedSize) {
    const flag = source[src_pos];

    for (let i = 0; i < 8; i += 1) {
      src_pos += 1;

      if ((flag & (1 << i)) !== 0) {
        target[tgt_pos] = source[src_pos];
        tgt_pos += 1;
      } else {
        const e = source[src_pos] * 256 + source[src_pos + 1];
        const len = ((e >> 8) & 0x000f) + info.type + 1;
        const addr = ((e << 4) & 0x0ff0) + ((e >> 12) & 0x00ff);

        for (let g = 0; g < len; g += 1) {
          target[tgt_pos] = target[tgt_pos - addr - 1];
          tgt_pos += 1;
        }
        src_pos += 1;
      }

      if (src_pos + 1 >= info.compressedSize) break;
    }

    src_pos += 1;
  }
  return tgt_buffer;
}
