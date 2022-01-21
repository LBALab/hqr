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
}
