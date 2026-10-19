import { createBubbleSortSteps, DEFAULT_BUBBLE_SORT_INPUT } from '../lib/bubbleSort'

export type VisualKind = 'array' | 'stack' | 'queue' | 'tree' | 'graph' | 'hash'

export interface AlgorithmStep {
  id: number
  line: number
  label: string
  summary: string
  values?: Array<number | null>
  active?: number[]
  stack?: number[]
  queue?: number[]
  tree?: Array<{ id: string; value: number; left?: string; right?: string; x: number; y: number }>
  graph?: Array<{ id: string; x: number; y: number; value: number }>
  edges?: Array<[string, string]>
}

export interface AlgorithmSpec {
  id: string
  title: string
  module: string
  dataStructure: string
  kind: VisualKind
  description: string
  complexity: string
  pseudocode: string[]
  steps: AlgorithmStep[]
}

export const stationCards = [
  { id: 'arrays', title: 'Arrays & Sorting', accent: 'cyan', icon: 'Grid3X3', description: 'Compare ordering strategies and recognize efficient patterns in motion.' },
  { id: 'linked-lists', title: 'Linked Lists', accent: 'violet', icon: 'Link2', description: 'Trace pointer navigation and restructure node chains with confidence.' },
  { id: 'stacks', title: 'Stacks & Queues', accent: 'emerald', icon: 'Layers3', description: 'Explore lifo and fifo operations through live state transitions.' },
  { id: 'trees', title: 'Trees', accent: 'amber', icon: 'GitBranchPlus', description: 'Follow traversal paths across hierarchical structures and decision nodes.' },
  { id: 'graphs', title: 'Graphs', accent: 'rose', icon: 'Network', description: 'Visit connected components and weighted relationships with pathfinding logic.' },
  { id: 'hashes', title: 'Hash Tables', accent: 'sky', icon: 'DatabaseZap', description: 'Measure collisions, indexing, and lookup performance across buckets.' },
  { id: 'searching', title: 'Searching', accent: 'fuchsia', icon: 'Search', description: 'Optimize lookup by comparing linear and divide-and-conquer strategies.' },
]

export const algorithmCatalog: AlgorithmSpec[] = [
  {
    id: 'binary-search',
    title: 'Binary Search',
    module: 'Searching',
    dataStructure: 'Sorted array',
    kind: 'array',
    description: 'Use divide-and-conquer to quickly find a target in a sorted list.',
    complexity: 'Time O(log n) • Space O(1)',
    pseudocode: [
      'start with low = 0 and high = n - 1',
      'mid = floor((low + high) / 2)',
      'if value == arr[mid], return mid',
      'if value < arr[mid], narrow to left half',
      'otherwise, narrow to right half',
      'repeat until the value is found or the range closes',
    ],
    steps: [
      { id: 0, line: 0, label: 'Initialize', summary: 'We begin with the full search interval across the sorted list.', values: [4, 8, 12, 16, 22, 28, 35, 40], active: [0, 7] },
      { id: 1, line: 1, label: 'Midpoint', summary: 'The midpoint is 22, which is larger than the target value 16.', values: [4, 8, 12, 16, 22, 28, 35, 40], active: [3] },
      { id: 2, line: 3, label: 'Narrow left', summary: 'We discard the right half and continue searching the left interval.', values: [4, 8, 12, 16, 22, 28, 35, 40], active: [0, 2] },
      { id: 3, line: 1, label: 'Midpoint', summary: 'The next midpoint is 12, and it is still smaller than the target.', values: [4, 8, 12, 16, 22, 28, 35, 40], active: [2] },
      { id: 4, line: 3, label: 'Narrow right', summary: 'The target is now inside the higher half of the remaining interval.', values: [4, 8, 12, 16, 22, 28, 35, 40], active: [3, 3] },
      { id: 5, line: 2, label: 'Found', summary: 'The final midpoint matches the target, and the search ends.', values: [4, 8, 12, 16, 22, 28, 35, 40], active: [3] },
    ],
  },
  {
    id: 'bubble-sort',
    title: 'Bubble Sort',
    module: 'Arrays & Sorting',
    dataStructure: 'Unsorted array',
    kind: 'array',
    description: 'Repeatedly compare adjacent values and swap them until the list is ordered.',
    complexity: 'Time O(n²) • Space O(1)',
    pseudocode: [
      'for each pass through the list',
      'compare adjacent values',
      'if left > right, swap them',
      'continue until no swaps occur',
      'the array is sorted',
    ],
    steps: createBubbleSortSteps(DEFAULT_BUBBLE_SORT_INPUT),
  },
  {
    id: 'stack-demo',
    title: 'Stack Push / Pop',
    module: 'Stacks & Queues',
    dataStructure: 'Stack',
    kind: 'stack',
    description: 'Follow LIFO ordering while values are pushed and popped from the top.',
    complexity: 'Time O(1) • Space O(n)',
    pseudocode: [
      'push value onto the top of the stack',
      'if stack is full, raise overflow',
      'pop the top value when requested',
      'read the top without removing it',
    ],
    steps: [
      { id: 0, line: 0, label: 'Push 12', summary: 'The first value enters the stack and becomes the new top.', stack: [12], active: [0] },
      { id: 1, line: 0, label: 'Push 28', summary: 'The next push places 28 above 12.', stack: [12, 28], active: [1] },
      { id: 2, line: 2, label: 'Pop', summary: '28 is removed first because stacks follow last-in, first-out order.', stack: [12], active: [0] },
      { id: 3, line: 0, label: 'Push 41', summary: 'A higher value is added to the top of the remaining stack.', stack: [12, 41], active: [1] },
      { id: 4, line: 3, label: 'Peek', summary: 'The top is read without modifying the data structure.', stack: [12, 41], active: [1] },
    ],
  },
  {
    id: 'queue-demo',
    title: 'Queue Enqueue / Dequeue',
    module: 'Stacks & Queues',
    dataStructure: 'Queue',
    kind: 'queue',
    description: 'Observe FIFO behavior as items enter from the rear and leave from the front.',
    complexity: 'Time O(1) • Space O(n)',
    pseudocode: [
      'enqueue item at the rear',
      'if the queue is empty, set front to the new element',
      'dequeue the item at the front',
      'repeat until the queue drains',
    ],
    steps: [
      { id: 0, line: 0, label: 'Enqueue 8', summary: '8 is placed at the end of the queue.', queue: [8], active: [0] },
      { id: 1, line: 0, label: 'Enqueue 14', summary: '14 waits behind 8, preserving FIFO ordering.', queue: [8, 14], active: [1] },
      { id: 2, line: 2, label: 'Dequeue', summary: '8 leaves first because it has been waiting the longest.', queue: [14], active: [0] },
      { id: 3, line: 0, label: 'Enqueue 21', summary: '21 joins the back of the queue after 14.', queue: [14, 21], active: [1] },
      { id: 4, line: 2, label: 'Dequeue again', summary: '14 is removed next, keeping the queue in order.', queue: [21], active: [0] },
    ],
  },
  {
    id: 'tree-traversal',
    title: 'Tree DFS',
    module: 'Trees',
    dataStructure: 'Binary tree',
    kind: 'tree',
    description: 'Traverse the tree depth-first by visiting each node before its children.',
    complexity: 'Time O(n) • Space O(h)',
    pseudocode: [
      'visit the current node',
      'recursively traverse the left subtree',
      'then traverse the right subtree',
      'stop when every node has been visited',
    ],
    steps: [
      { id: 0, line: 0, label: 'Visit root', summary: 'The root node 12 is visited first.', tree: [
        { id: '12', value: 12, x: 50, y: 15, left: '7', right: '19' },
        { id: '7', value: 7, x: 30, y: 45 },
        { id: '19', value: 19, x: 70, y: 45 },
      ], active: [0] },
      { id: 1, line: 1, label: 'Left subtree', summary: 'The algorithm dives into the left subtree and explores node 7.', tree: [
        { id: '12', value: 12, x: 50, y: 15, left: '7', right: '19' },
        { id: '7', value: 7, x: 30, y: 45 },
        { id: '19', value: 19, x: 70, y: 45 },
      ], active: [1] },
      { id: 2, line: 2, label: 'Right subtree', summary: 'After finishing the left branch, it explores the right side through 19.', tree: [
        { id: '12', value: 12, x: 50, y: 15, left: '7', right: '19' },
        { id: '7', value: 7, x: 30, y: 45 },
        { id: '19', value: 19, x: 70, y: 45 },
      ], active: [2] },
      { id: 3, line: 3, label: 'Complete', summary: 'Each node in the traversal path has been visited exactly once.', tree: [
        { id: '12', value: 12, x: 50, y: 15, left: '7', right: '19' },
        { id: '7', value: 7, x: 30, y: 45 },
        { id: '19', value: 19, x: 70, y: 45 },
      ], active: [0, 1, 2] },
    ],
  },
  {
    id: 'graph-bfs',
    title: 'Graph BFS',
    module: 'Graphs',
    dataStructure: 'Adjacency graph',
    kind: 'graph',
    description: 'Visit each vertex by level, exploring neighbors in breadth-first order.',
    complexity: 'Time O(V + E) • Space O(V)',
    pseudocode: [
      'enqueue the start node',
      'mark it as visited',
      'process the front of the queue',
      'enqueue every unvisited neighbor',
      'repeat until the queue is empty',
    ],
    steps: [
      { id: 0, line: 0, label: 'Start', summary: 'The queue begins with node A as the initial source.', graph: [{ id: 'A', x: 15, y: 50, value: 1 }, { id: 'B', x: 35, y: 30, value: 2 }, { id: 'C', x: 35, y: 70, value: 3 }, { id: 'D', x: 60, y: 30, value: 4 }, { id: 'E', x: 60, y: 70, value: 5 }], edges: [['A','B'], ['A','C'], ['B','D'], ['C','E']], active: [0] },
      { id: 1, line: 1, label: 'Visit A', summary: 'A is marked visited and we expand outward to its neighbors.', graph: [{ id: 'A', x: 15, y: 50, value: 1 }, { id: 'B', x: 35, y: 30, value: 2 }, { id: 'C', x: 35, y: 70, value: 3 }, { id: 'D', x: 60, y: 30, value: 4 }, { id: 'E', x: 60, y: 70, value: 5 }], edges: [['A','B'], ['A','C'], ['B','D'], ['C','E']], active: [0] },
      { id: 2, line: 3, label: 'Expand level 1', summary: 'Neighbors B and C are discovered and queued for the next layer.', graph: [{ id: 'A', x: 15, y: 50, value: 1 }, { id: 'B', x: 35, y: 30, value: 2 }, { id: 'C', x: 35, y: 70, value: 3 }, { id: 'D', x: 60, y: 30, value: 4 }, { id: 'E', x: 60, y: 70, value: 5 }], edges: [['A','B'], ['A','C'], ['B','D'], ['C','E']], active: [1, 2] },
      { id: 3, line: 3, label: 'Expand level 2', summary: 'The next frontier reaches D and E, completing the breadth-first walk.', graph: [{ id: 'A', x: 15, y: 50, value: 1 }, { id: 'B', x: 35, y: 30, value: 2 }, { id: 'C', x: 35, y: 70, value: 3 }, { id: 'D', x: 60, y: 30, value: 4 }, { id: 'E', x: 60, y: 70, value: 5 }], edges: [['A','B'], ['A','C'], ['B','D'], ['C','E']], active: [3, 4] },
    ],
  },
  {
    id: 'hash-table',
    title: 'Hash Insert',
    module: 'Hash Tables',
    dataStructure: 'Open addressing hash table',
    kind: 'hash',
    description: 'Calculate a hash index and resolve collisions by placing values into the next free bucket.',
    complexity: 'Time O(1) average • Space O(n)',
    pseudocode: [
      'compute the hash of the key',
      'use modulo to choose the bucket',
      'if the slot is occupied, continue probing',
      'store the value in the next available slot',
    ],
    steps: [
      { id: 0, line: 0, label: 'Hash 17', summary: 'The key 17 maps to bucket 2 using a modulo-based hash.', values: [null, null, 17, null, null, 5], active: [2] },
      { id: 1, line: 1, label: 'Probe 47', summary: '47 also hashes to bucket 2, so the algorithm probes forward to the next free slot.', values: [null, null, 17, 47, null, 5], active: [3] },
      { id: 2, line: 2, label: 'Insert 9', summary: 'The next value lands in a different bucket without collision.', values: [null, null, 17, 47, 9, 5], active: [4] },
      { id: 3, line: 3, label: 'Completed', summary: 'All values are placed and the hash table remains searchable.', values: [null, null, 17, 47, 9, 5], active: [0, 1, 2, 3, 4, 5] },
    ],
  },
]
