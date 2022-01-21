import fs from 'fs/promises';
import path from 'path';

import { HQR } from '../src';

export async function readHQRFile(filename: string): Promise<Buffer> {
  return fs.readFile(path.join(__dirname, `data/${filename}`));
}

export async function binaryCompare(hqr: HQR, filename: string) {
  const generated = Buffer.from(hqr.toArrayBuffer());
  const original = await readHQRFile(filename);
  expect(generated.compare(original)).toBe(0);
}
