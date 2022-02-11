const INDEX_BIT_COUNT = 12;
const LENGTH_BIT_COUNT = 4;
const RAW_LOOK_AHEAD_SIZE = 1 << LENGTH_BIT_COUNT;
const MAX_OFFSET = (1 << INDEX_BIT_COUNT) + 1;
const TREE_ROOT = MAX_OFFSET;
const UNUSED = -1;

enum Child {
  Smaller = 0,
  Larger = 1,
}

interface DefTree {
  parent: number;
  children: [number, number];
  which_child: number;
}

const tree: DefTree[] = (() => {
  const t = new Array<DefTree>(MAX_OFFSET + 2);
  for (let i = 0; i < t.length; i++) {
    t[i] = { parent: 0, children: [0, 0], which_child: 0 };
  }
  return t;
})();

function initTree() {
  tree[0].parent = 0;
  tree[0].children[0] = 0;
  tree[0].children[1] = 0;
  tree[0].which_child = 0;
  for (let i = 1; i < tree.length; i++) {
    tree[i].parent = UNUSED;
    tree[i].children[0] = UNUSED;
    tree[i].children[1] = UNUSED;
    tree[i].which_child = UNUSED;
  }
}

function copyNode(src: number, tgt: number) {
  tree[tgt].parent = tree[src].parent;
  tree[tgt].children[0] = tree[src].children[0];
  tree[tgt].children[1] = tree[src].children[1];
  tree[tgt].which_child = tree[src].which_child;
}

function replaceParents(node: number) {
  tree[tree[node + 1].children[Child.Smaller] + 1].parent = node;
  tree[tree[node + 1].children[Child.Larger] + 1].parent = node;
}

function replace_node(old_node: number, new_node: number) {
  copyNode(old_node + 1, new_node + 1);

  replaceParents(new_node);

  tree[tree[old_node + 1].parent + 1].children[tree[old_node + 1].which_child] =
    new_node;
}

function updateParent(node: number, parent: number, which_child: number) {
  tree[node + 1].parent = parent;
  tree[node + 1].which_child = which_child;
}

function findNextNode(node: number): number {
  let next = tree[node + 1].children[Child.Smaller];

  if (tree[next + 1].children[Child.Larger] === UNUSED)
    tree[node + 1].children[Child.Smaller] =
      tree[next + 1].children[Child.Smaller];
  else {
    while (tree[next + 1].children[Child.Larger] !== UNUSED)
      next = tree[next + 1].children[Child.Larger];
    tree[tree[next + 1].parent + 1].children[Child.Larger] =
      tree[next + 1].children[Child.Smaller];
  }

  return next;
}

function updateChild(src_tree: number, which_child: number) {
  if (tree[src_tree + 1].children[which_child] !== UNUSED)
    updateParent(
      tree[src_tree + 1].children[which_child],
      tree[src_tree + 1].parent,
      tree[src_tree + 1].which_child
    );

  tree[tree[src_tree + 1].parent + 1].children[tree[src_tree + 1].which_child] =
    tree[src_tree + 1].children[which_child];
}

// Adapted from:
// https://github.com/OBattler/lbatools-c/blob/master/compress/lzmit.c
export function compressLZSS_LBA_type_2(data: ArrayBuffer): ArrayBuffer {
  let val = 0;
  let src_off = 0;
  let out_len = 1;
  let offset_off = 0;
  let flag_bit = 0;
  let best_match = 1;
  let best_node = 0;

  const length = data.byteLength;

  if (length <= RAW_LOOK_AHEAD_SIZE) {
    return data;
  }

  const input = new Uint8Array(data);
  const output = new Uint8Array(length);

  initTree();

  while (best_match + src_off - 1 < length) {
    let i = best_match;
    while (i > 0) {
      const src_tree = src_off % MAX_OFFSET;

      if (tree[src_tree + 1].parent !== UNUSED) {
        if (
          tree[src_tree + 1].children[Child.Smaller] !== UNUSED &&
          tree[src_tree + 1].children[Child.Larger] !== UNUSED
        ) {
          const replacement = findNextNode(src_tree);
          updateParent(
            tree[replacement + 1].children[Child.Smaller],
            tree[replacement + 1].parent,
            tree[replacement + 1].which_child
          );
          replace_node(src_tree, replacement);
        } else {
          updateChild(
            src_tree,
            tree[src_tree + 1].children[Child.Smaller] === UNUSED
              ? Child.Larger
              : Child.Smaller
          );
        }
      }

      tree[src_tree + 1].children[Child.Larger] = UNUSED;
      tree[src_tree + 1].children[Child.Smaller] = UNUSED;

      let cur_node = tree[TREE_ROOT + 1].children[Child.Smaller];

      if (cur_node < 0) {
        best_match = 0;
        best_node = 0;

        updateParent(src_tree, TREE_ROOT, 0);
        tree[TREE_ROOT + 1].children[Child.Smaller] = src_tree;
      } else {
        best_match = 2;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          let cur_string = src_off;
          let cmp_string =
            cur_string - ((src_tree - cur_node + MAX_OFFSET) % MAX_OFFSET);
          const node = cur_node;
          let j = RAW_LOOK_AHEAD_SIZE + 2;
          cur_node = j - 1;

          let diff: number;
          do diff = input[cur_string++] - input[cmp_string++];
          while (--j !== 0 && diff === 0);

          if (j !== 0 || diff !== 0) {
            cur_node -= j;
            if (cur_node > best_match) {
              best_match = cur_node;
              best_node = node;
            }

            j = diff >= 0 ? 1 : 0;
            cur_node = tree[node + 1].children[j];

            if (cur_node < 0) {
              updateParent(src_tree, node, j);
              tree[node + 1].children[j] = src_tree;
              break;
            }
          } else {
            replace_node(node, src_tree);
            tree[node + 1].parent = UNUSED;
            best_match = RAW_LOOK_AHEAD_SIZE + 2;
            best_node = node;
            break;
          }
        }
      }

      if (--i > 0) src_off++;
    }

    if (out_len >= length - RAW_LOOK_AHEAD_SIZE - 1) {
      return data;
    }

    val >>= 1;

    if (best_match > 2 && src_off + best_match <= length) {
      const temp =
        (best_match - 3) |
        ((src_off - best_node - 1 + MAX_OFFSET) % MAX_OFFSET <<
          LENGTH_BIT_COUNT);
      output[out_len] = temp & 0xff;
      output[out_len + 1] = temp >> 8;
      out_len += 2;
    } else {
      output[out_len++] = input[src_off];
      val |= 0x80;
      best_match = 1;
    }

    flag_bit++;
    if (flag_bit >= 8) {
      flag_bit = 0;
      output[offset_off] = val & 0xff;
      offset_off = out_len;
      out_len++;
    }

    src_off++;
  }

  if (flag_bit === 0) out_len--;
  else if (flag_bit < 8) output[offset_off] = val >> (8 - flag_bit);

  return output.buffer.slice(0, out_len);
}
