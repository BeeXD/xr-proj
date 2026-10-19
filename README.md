# AlgoSpace XR

AlgoSpace XR is a browser-based data-structures and algorithms laboratory built with React, TypeScript, Zustand, Vite, and Three.js.

## Learning stations

The shared typed execution engine in `src/lib/execution.ts` registers deterministic, immutable step snapshots for:

- Arrays and Bubble, Selection, Insertion, Merge, and Quick Sort
- Linked-list insertion, deletion, search, and reversal
- Stack and queue operations, including capacity, overflow, and underflow
- Binary-search-tree insertion, search, and four traversals
- Graph node/edge editing, BFS, and DFS
- Chained hash-table insertion, search, and deletion
- Linear and binary search

Open a station from the dashboard. Each station workspace uses the registered algorithm definitions and keeps the active session, step index, playback status, input, and speed in the Zustand store. The rendered structure, live explanation, operation log, and pseudocode highlight follow the current step snapshot.

## Development

```sh
npm install
npm run dev
```

## Validation

```sh
npm test
npm run lint
npx tsc -b --pretty false
npm run build
```

The unit and component tests cover algorithm snapshots, data-structure operations, navigation, playback, reset, randomization, and station entry flows.
