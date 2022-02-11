const INDEX_BIT_COUNT = 12;
const LENGTH_BIT_COUNT = 4;
const WINDOW_SIZE = 1 << INDEX_BIT_COUNT;
const RAW_LOOK_AHEAD_SIZE = 1 << LENGTH_BIT_COUNT;
const BREAK_EVEN = Math.floor((1 + INDEX_BIT_COUNT + LENGTH_BIT_COUNT) / 9);
const LOOK_AHEAD_SIZE = RAW_LOOK_AHEAD_SIZE + BREAK_EVEN;
const TREE_ROOT = WINDOW_SIZE;
const UNUSED = -1;
const MOD_WINDOW = (a: number) => a & (WINDOW_SIZE - 1);

enum Child {
  Smaller = 0,
  Larger = 1,
}

interface DefTree {
  parent: number;
  children: [number, number];
}

let current_pos: number;
let match_pos: number;
const win = new Uint8Array(WINDOW_SIZE * 5);
const tree: DefTree[] = (() => {
  const t = new Array<DefTree>(WINDOW_SIZE + 2);
  for (let i = 0; i < t.length; i++) {
    t[i] = { parent: 0, children: [0, 0] };
  }
  return t;
})();

function initTree(r: number) {
  for (let i = 0; i <= WINDOW_SIZE; i++) {
    const node = tree[i];
    node.parent = UNUSED;
    node.children[Child.Smaller] = UNUSED;
    node.children[Child.Larger] = UNUSED;
  }
  tree[TREE_ROOT].children[Child.Larger] = r;
  tree[r].parent = TREE_ROOT;
  tree[-1] = tree[WINDOW_SIZE + 1];
}

function contractNode(old_node: number, new_node: number) {
  tree[new_node].parent = tree[old_node].parent;
  if (tree[tree[old_node].parent].children[Child.Larger] === old_node)
    tree[tree[old_node].parent].children[Child.Larger] = new_node;
  else tree[tree[old_node].parent].children[Child.Smaller] = new_node;
  tree[old_node].parent = UNUSED;
}

function copyNode(new_node: number, old_node: number) {
  tree[new_node].parent = tree[old_node].parent;
  tree[new_node].children[Child.Smaller] =
    tree[old_node].children[Child.Smaller];
  tree[new_node].children[Child.Larger] = tree[old_node].children[Child.Larger];
}

function replaceNode(old_node: number, new_node: number) {
  const parent = tree[old_node].parent;
  if (tree[parent].children[Child.Smaller] === old_node)
    tree[parent].children[Child.Smaller] = new_node;
  else tree[parent].children[Child.Larger] = new_node;
  copyNode(new_node, old_node);
  if (tree[new_node].children[Child.Smaller] !== UNUSED)
    tree[tree[new_node].children[Child.Smaller]].parent = new_node;
  if (tree[new_node].children[Child.Larger] !== UNUSED)
    tree[tree[new_node].children[Child.Larger]].parent = new_node;
  tree[old_node].parent = UNUSED;
}

function findNextNode(node: number) {
  let next = tree[node].children[Child.Smaller];
  while (tree[next].children[Child.Larger] !== UNUSED)
    next = tree[next].children[Child.Larger];
  return next;
}

function deleteString(p: number) {
  if (tree[p].parent === UNUSED) return;
  if (tree[p].children[Child.Larger] === UNUSED)
    contractNode(p, tree[p].children[Child.Smaller]);
  else if (tree[p].children[Child.Smaller] === UNUSED)
    contractNode(p, tree[p].children[Child.Larger]);
  else {
    const replacement = findNextNode(p);
    deleteString(replacement);
    replaceNode(p, replacement);
  }
}

function addString(): number {
  let i = 0;
  let delta = 0;
  let test_node = tree[TREE_ROOT].children[Child.Larger];
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
    const child_node = tree[test_node];
    const child_prop = delta >= 0 ? Child.Larger : Child.Smaller;
    if (child_node.children[child_prop] === UNUSED) {
      child_node.children[child_prop] = current_pos;
      tree[current_pos].parent = test_node;
      tree[current_pos].children[Child.Larger] = UNUSED;
      tree[current_pos].children[Child.Smaller] = UNUSED;
      return match_length;
    }
    test_node = child_node.children[child_prop];
  }
}

// Adapted from:
// https://github.com/2point21/lba2-classic/blob/main/SOURCES/LZSS.CPP
export function compressLZSS_LBA_type_1(data: ArrayBuffer): ArrayBuffer {
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
