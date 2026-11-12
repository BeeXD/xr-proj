export const stationCards = [
  { id: 'arrays', title: 'Arrays & Sorting', accent: 'cyan', description: 'Compare ordering strategies and recognize efficient patterns in motion.' },
  { id: 'linked-lists', title: 'Linked Lists', accent: 'violet', description: 'Trace pointer navigation and restructure node chains with confidence.' },
  { id: 'stacks', title: 'Stacks & Queues', accent: 'emerald', description: 'Explore LIFO and FIFO operations through live state transitions.' },
  { id: 'trees', title: 'Trees', accent: 'amber', description: 'Follow traversal paths across hierarchical structures and decision nodes.' },
  { id: 'graphs', title: 'Graphs', accent: 'rose', description: 'Add vertices and edges, then watch breadth-first and depth-first search explore them.' },
  { id: 'hashes', title: 'Hash Tables', accent: 'sky', description: 'Watch keys hash into buckets and chain together when they collide.' },
  { id: 'searching', title: 'Searching', accent: 'fuchsia', description: 'Optimize lookup by comparing linear and divide-and-conquer strategies.' },
]

// Short button labels per station, shared by the workspace page and the VR panel.
export const stationOperations: Record<string, Array<{ id: string; label: string }>> = {
  arrays: [
    { id: 'array.insert', label: 'Insert value' },
    { id: 'array.delete', label: 'Delete value' },
    { id: 'array.access', label: 'Access index' },
    { id: 'array.reverse', label: 'Reverse' },
    { id: 'sort.bubble', label: 'Bubble Sort' },
    { id: 'sort.selection', label: 'Selection Sort' },
    { id: 'sort.insertion', label: 'Insertion Sort' },
    { id: 'sort.merge', label: 'Merge Sort' },
    { id: 'sort.quick', label: 'Quick Sort' },
  ],
  'linked-lists': [
    { id: 'list.insert-head', label: 'Insert at head' },
    { id: 'list.insert-tail', label: 'Insert at tail' },
    { id: 'list.insert-index', label: 'Insert at index' },
    { id: 'list.delete', label: 'Delete value' },
    { id: 'list.search', label: 'Search' },
    { id: 'list.reverse', label: 'Reverse' },
  ],
  stacks: [
    { id: 'stack.push', label: 'Push' },
    { id: 'stack.pop', label: 'Pop' },
    { id: 'stack.peek', label: 'Peek' },
    { id: 'stack.clear', label: 'Clear' },
  ],
  queues: [
    { id: 'queue.enqueue', label: 'Enqueue' },
    { id: 'queue.dequeue', label: 'Dequeue' },
    { id: 'queue.peek', label: 'Queue peek' },
    { id: 'queue.clear', label: 'Clear queue' },
  ],
  trees: [
    { id: 'tree.insert', label: 'BST insert' },
    { id: 'tree.search', label: 'BST search' },
    { id: 'tree.inorder', label: 'In-order' },
    { id: 'tree.preorder', label: 'Pre-order' },
    { id: 'tree.postorder', label: 'Post-order' },
    { id: 'tree.levelorder', label: 'Level-order' },
  ],
  graphs: [
    { id: 'graph.add-node', label: 'Add node' },
    { id: 'graph.add-edge', label: 'Add edge' },
    { id: 'graph.bfs', label: 'BFS' },
    { id: 'graph.dfs', label: 'DFS' },
  ],
  hashes: [
    { id: 'hash.insert', label: 'Insert' },
    { id: 'hash.search', label: 'Search' },
    { id: 'hash.delete', label: 'Delete' },
  ],
  searching: [
    { id: 'search.linear', label: 'Linear Search' },
    { id: 'search.binary', label: 'Binary Search' },
  ],
}
