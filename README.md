# Engram

Train tiny character-level language models in the browser with TensorFlow.js.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — Next.js dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm test` — Jest unit tests (sampler)

## What it does

1. Paste / upload / load a sample corpus
2. Configure GRU or LSTM (seq length, embed dim, hidden units, LR, batch)
3. Train client-side; watch live loss + epoch log
4. Generate text with temperature sampling
5. Inspect layer activations on the canvas
6. Models + corpus persist in IndexedDB across refreshes
