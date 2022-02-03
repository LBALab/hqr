import HQRReader, { ReadOptions } from './HQRReader';
import HQRWriter, { WriteOptions } from './HQRWriter';
import { HQREntryElement } from './types';
export default class HQR {
  readonly entries: HQREntryElement[] = [];

  static fromArrayBuffer(
    buffer: ArrayBuffer,
    options: Partial<ReadOptions> = {}
  ): HQR {
    return new HQRReader(buffer, options).read();
  }

  toArrayBuffer(options: Partial<WriteOptions> = {}): ArrayBuffer {
    return new HQRWriter(this, options).write();
  }

  dump(): void {
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (entry) {
        console.log(
          `${i}: type=${entry.type} size=${
            entry.content.byteLength
          } compressed=${entry.metadata.compressedSize || '?'}`
        );
        for (let j = 0; j < entry.hiddenEntries.length; j++) {
          const hidden = entry.hiddenEntries[j];
          console.log(
            `  ${i}.${j}(hidden): type=${hidden.type} size=${
              hidden.content.byteLength
            } compressed=${hidden.metadata.compressedSize || '?'}`
          );
        }
      } else {
        console.log(`${i}: blank`);
      }
    }
  }
}
