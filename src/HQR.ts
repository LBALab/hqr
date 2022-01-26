import HQREntry from './HQREntry';
import HQRLazyEntry from './HQRLazyEntry';
import HQRReader, { ReadOptions } from './HQRReader';
import HQRWriter, { WriteOptions } from './HQRWriter';

type HQREntryElement = HQREntry | HQRLazyEntry | null;

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
          `${i}: type=${entry.type} size=${entry.content.byteLength}`
        );
        let j = 0;
        let hidden = entry.next;
        while (hidden) {
          console.log(
            `  ${i}.${j}(hidden): type=${hidden.type} size=${hidden.content.byteLength}`
          );
          hidden = hidden.next;
          j++;
        }
      } else {
        console.log(`${i}: blank`);
      }
    }
  }
}
