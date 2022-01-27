export function decompressLZSS_LBA(
  buffer: ArrayBuffer,
  originalSize: number,
  type: number
): ArrayBuffer {
  if (originalSize === buffer.byteLength) return buffer;
  const tgt_buffer = new ArrayBuffer(originalSize);
  const source = new Uint8Array(buffer);
  const target = new Uint8Array(tgt_buffer);
  let src_pos = 0;
  let tgt_pos = 0;
  while (src_pos + 1 <= source.byteLength) {
    const flag = source[src_pos];

    for (let i = 0; i < 8; i += 1) {
      src_pos += 1;

      if ((flag & (1 << i)) !== 0) {
        target[tgt_pos] = source[src_pos];
        tgt_pos += 1;
      } else {
        const e = source[src_pos] * 256 + source[src_pos + 1];
        const len = ((e >> 8) & 0x000f) + type + 1;
        const addr = ((e << 4) & 0x0ff0) + ((e >> 12) & 0x00ff);

        for (let g = 0; g < len; g += 1) {
          target[tgt_pos] = target[tgt_pos - addr - 1];
          tgt_pos += 1;
        }
        src_pos += 1;
      }

      if (src_pos + 1 >= source.byteLength) break;
    }

    src_pos += 1;
  }
  return tgt_buffer;
}

const INDEX_BIT_COUNT = 12;
const LENGTH_BIT_COUNT = 4;
const WINDOW_SIZE = 1 << INDEX_BIT_COUNT;
const RAW_LOOK_AHEAD_SIZE = 1 << LENGTH_BIT_COUNT;
const BREAK_EVEN = Math.floor((1 + INDEX_BIT_COUNT + LENGTH_BIT_COUNT) / 9);
const LOOK_AHEAD_SIZE = RAW_LOOK_AHEAD_SIZE + BREAK_EVEN;
const TREE_ROOT = WINDOW_SIZE;
const UNUSED = -1;
const MOD_WINDOW = (a: number) => a & (WINDOW_SIZE - 1);

interface DefTree {
  parent: number;
  smaller_child: number;
  larger_child: number;
}

let current_pos: number;
let match_pos: number;
const win = new Uint8Array(WINDOW_SIZE * 5);
const tree: DefTree[] = (() => {
  const t = new Array<DefTree>(WINDOW_SIZE + 2);
  for (let i = 0; i < t.length; i += 1) {
    t[i] = { parent: 0, smaller_child: 0, larger_child: 0 };
  }
  return t;
})();

function initTree(r: number) {
  for (let i = 0; i <= WINDOW_SIZE; i++) {
    const node = tree[i];
    node.parent = UNUSED;
    node.smaller_child = UNUSED;
    node.larger_child = UNUSED;
  }
  tree[TREE_ROOT].larger_child = r;
  tree[r].parent = TREE_ROOT;
  tree[-1] = tree[WINDOW_SIZE + 1];
}

function contractNode(old_node: number, new_node: number) {
  tree[new_node].parent = tree[old_node].parent;
  if (tree[tree[old_node].parent].larger_child === old_node)
    tree[tree[old_node].parent].larger_child = new_node;
  else tree[tree[old_node].parent].smaller_child = new_node;
  tree[old_node].parent = UNUSED;
}

function copyNode(new_node: number, old_node: number) {
  tree[new_node].parent = tree[old_node].parent;
  tree[new_node].smaller_child = tree[old_node].smaller_child;
  tree[new_node].larger_child = tree[old_node].larger_child;
}

function replaceNode(old_node: number, new_node: number) {
  const parent = tree[old_node].parent;
  if (tree[parent].smaller_child === old_node)
    tree[parent].smaller_child = new_node;
  else tree[parent].larger_child = new_node;
  copyNode(new_node, old_node);
  if (tree[new_node].smaller_child !== UNUSED)
    tree[tree[new_node].smaller_child].parent = new_node;
  if (tree[new_node].larger_child !== UNUSED)
    tree[tree[new_node].larger_child].parent = new_node;
  tree[old_node].parent = UNUSED;
}

function findNextNode(node: number) {
  let next = tree[node].smaller_child;
  while (tree[next].larger_child !== UNUSED) next = tree[next].larger_child;
  return next;
}

function deleteString(p: number) {
  if (tree[p].parent === UNUSED) return;
  if (tree[p].larger_child === UNUSED) contractNode(p, tree[p].smaller_child);
  else if (tree[p].smaller_child === UNUSED)
    contractNode(p, tree[p].larger_child);
  else {
    const replacement = findNextNode(p);
    deleteString(replacement);
    replaceNode(p, replacement);
  }
}

interface ChildPropPtr {
  node: DefTree;
  prop: 'smaller_child' | 'larger_child';
}

function addString(): number {
  let i = 0;
  let delta = 0;
  let test_node = tree[TREE_ROOT].larger_child;
  let match_length = 0;
  for (;;) {
    for (i = 0; i < LOOK_AHEAD_SIZE; i++) {
      delta = win[MOD_WINDOW(current_pos + i)] - win[MOD_WINDOW(test_node + i)];
      if (delta !== 0) break;
    }
    if (i >= match_length) {
      match_length = i;
      match_pos = test_node;
      if (match_length >= LOOK_AHEAD_SIZE) {
        replaceNode(test_node, current_pos);
        return match_length;
      }
    }
    const child: ChildPropPtr = {
      node: tree[test_node],
      prop: delta >= 0 ? 'larger_child' : 'smaller_child',
    };
    if (child.node[child.prop] === UNUSED) {
      child.node[child.prop] = current_pos;
      tree[current_pos].parent = test_node;
      tree[current_pos].larger_child = UNUSED;
      tree[current_pos].smaller_child = UNUSED;
      return match_length;
    }
    test_node = child.node[child.prop];
  }
}

// Adapted from:
// https://github.com/2point21/lba2-classic/blob/main/SOURCES/LZSS.CPP
export function compressLZSS_LBA(data: ArrayBuffer): ArrayBuffer {
  let i: number;
  let read = 0;
  let write = 0;
  let info: number;
  let look_ahead_bytes: number;
  let replace_count: number;
  let match_length: number;
  let count_bits = 0;
  let mask = 1;
  let len = 0;
  let length = data.byteLength;

  const input = new Uint8Array(data);
  const output = new Uint8Array(length);

  const save_length = length;
  current_pos = 0;

  for (i = 0; i < LOOK_AHEAD_SIZE; i++) {
    if (length === 0) break;
    win[current_pos + i] = input[read++];
    length--;
  }

  look_ahead_bytes = i;
  initTree(current_pos);
  match_length = 0;
  match_pos = 0;
  info = write++;

  if (++len >= save_length) return data;

  output[info] = 0;

  while (look_ahead_bytes > 0) {
    if (match_length > look_ahead_bytes) match_length = look_ahead_bytes;

    if (match_length <= BREAK_EVEN) {
      replace_count = 1;
      output[info] |= mask;
      output[write++] = win[current_pos];
      if (++len >= save_length) return data;
    } else {
      if ((len = len + 2) >= save_length) return data;

      const value =
        (MOD_WINDOW(current_pos - match_pos - 1) << LENGTH_BIT_COUNT) |
        (match_length - BREAK_EVEN - 1);
      const low = (value & 0xff00) >> 8;
      const high = value & 0xff;
      output[write] = high;
      output[write + 1] = low;

      write += 2;
      replace_count = match_length;
    }

    if (++count_bits === 8) {
      if (++len >= save_length) return data;
      info = write++;
      output[info] = 0;
      count_bits = 0;
      mask = 1;
    } else {
      mask = (mask << 1) & 0xff;
    }

    for (i = 0; i < replace_count; i++) {
      deleteString(MOD_WINDOW(current_pos + LOOK_AHEAD_SIZE));
      if (length === 0) look_ahead_bytes--;
      else {
        win[MOD_WINDOW(current_pos + LOOK_AHEAD_SIZE)] = input[read++];
        length--;
      }

      current_pos = MOD_WINDOW(current_pos + 1);
      if (look_ahead_bytes) match_length = addString();
    }
  }

  if (count_bits === 0) len--;
  return output.buffer.slice(0, len);
}
