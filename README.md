# AlgoSpace XR

AlgoSpace XR is a browser-based data-structures and algorithms laboratory built with React, TypeScript, Zustand, Vite, and Three.js. Every station can also be stepped through in VR on a WebXR headset.

## Learning stations

The shared typed execution engine in `src/lib/execution.ts` registers deterministic, immutable step snapshots for:

- Arrays and Bubble, Selection, Insertion, Merge, and Quick Sort
- Linked-list insertion, deletion, search, and reversal
- Stack and queue operations, including capacity, overflow, and underflow
- Binary-search-tree insertion, search, and four traversals
- Graph node/edge editing, BFS, and DFS
- Chained hash-table insertion, search, and deletion
- Linear and binary search

Open a station from the dashboard. Each station workspace uses the registered algorithm definitions and keeps the active session, step index, playback status, input, and speed in the Zustand store. The rendered structure, live explanation, operation log, and pseudocode highlight follow the current step snapshot. Settings and completed algorithms persist in `localStorage`.

## Development

```sh
npm install
npm run dev
```

## VR (Meta Quest)

WebXR runs in the Quest's built-in browser, so no native app is needed. It requires HTTPS when the page isn't served from `localhost`.

1. Put the PC and the Quest on the same Wi-Fi network.
2. Run `npm run dev:vr`. It serves HTTPS on your LAN with a self-signed certificate and prints a `Network:` URL.
3. In the Quest Browser, open that `https://<pc-ip>:5173` URL and accept the certificate warning (Advanced → Proceed). If the page doesn't load, allow Node.js through the Windows Firewall on private networks.
4. Open any station and press **Enter VR**. The menu rides on your left controller (or left hand with hand tracking). Point with the right controller and pull the trigger (or pinch) to step, play, run operations, and type values on the keypad. Click any element in the structure to make it the operation value.

Without HTTPS: connect the Quest over USB with developer mode enabled, run `adb reverse tcp:5173 tcp:5173` and `npm run dev`, then open `http://localhost:5173` in the Quest Browser.

No headset: on `http://localhost`, **Enter VR** starts the built-in Meta Quest 3 emulator from `@react-three/xr`.

Where you stand is set by `VR_ORIGIN`, and the hand menu's placement by `HAND_MENU_OFFSET`, `HAND_MENU_ROTATION` and `HAND_MENU_SCALE`, all in `src/components/AlgorithmLabScene.tsx`.

## Validation

```sh
npm test
npm run lint
npx tsc -b --pretty false
npm run build
```

The unit and component tests cover algorithm snapshots, data-structure operations, tree layout, navigation, playback, reset, randomization, and station entry flows.
