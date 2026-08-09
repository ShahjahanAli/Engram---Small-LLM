# Build a Next.js App: "Engram" — Train Small LLMs In-Browser

## 1. What we're building

A Next.js web app where a user can paste or upload a text corpus, configure a small
language model (tokenizer → embedding → sequence encoder → softmax output), train it
**client-side** using TensorFlow.js, watch training metrics update live, generate text
from the trained model with adjustable temperature, and see a real-time visualization
of neuron activations flowing through the network as it generates.

This is an educational / prototyping tool — not a production LLM trainer. Models are
character-level or small subword-level, parameter counts in the thousands—low millions,
and training happens in the browser tab (WebGL backend via TF.js) or optionally on a
Node server for larger runs. Treat every architectural decision through that lens:
favor clarity and inspectability over raw scale.

Reference implementation to match in spirit (single-file HTML/JS prototype already
built and validated — port its logic, don't reinvent it):
- Character-level tokenizer (unique chars → int IDs)
- `tf.layers.embedding` → `tf.layers.gru` → `tf.layers.dense(softmax)`
- Cross-entropy loss, Adam optimizer, `model.fit` with epoch callbacks
- Temperature-based sampling for generation
- Live loss chart
- Live network activation diagram (input chars → embedding vector → GRU hidden state
  → output probability distribution), redrawn every few generated characters using
  `tf.model({inputs, outputs: layer.output})` probes

---

## 2. Tech stack

- **Next.js 16, App Router, TypeScript** — strict mode on. Scaffold with
  `npx create-next-app@latest` (16 is the default as of this writing; if it isn't,
  pass `next@latest` explicitly). Turbopack is the default bundler in 16 for both
  `next dev` and `next build` — don't add a Webpack config unless something in the
  stretch goals genuinely needs it.
- **TensorFlow.js** (`@tensorflow/tfjs`) — client-side training/inference. Add
  `@tensorflow/tfjs-node` only if/when we add the optional server-side training route
  (see §8, stretch goal).

### Next.js 16 specifics that matter for this app

This app is a single client-heavy page, so most of Next.js 16's headline features
(Cache Components, PPR, layout deduplication across many routes) don't have much
surface area here — but a few things do apply:

- **`"use client"` at the top of every component under `/components`.** All the
  training/generation/visualization UI touches TF.js, canvas refs, and browser-only
  APIs (WebGL, IndexedDB) — none of it can be a Server Component. `/app/page.tsx`
  itself can stay a thin Server Component that just renders the client workbench.
- **Async `params`/`searchParams`/`cookies()`/`headers()`** are enforced in Next.js 16
  — only relevant if the stretch-goal server route (§8) reads request data; `await`
  them, don't destructure synchronously the old way.
- **Middleware is `proxy.ts`, not `middleware.ts`**, in Next.js 16 — irrelevant for v1
  (no auth/routing logic), but name it correctly if a later phase adds one.
- **React Compiler is stable in 16** — enable it (`experimental.reactCompiler: true`
  in `next.config.ts`, per current docs) so the frequent state updates from training
  callbacks and the activation canvas don't need hand-rolled `useMemo`/`useCallback`
  everywhere. Expect slightly slower dev/build compile times as a tradeoff (it's
  Babel-based) — acceptable for an app this size.
- **`next.config.ts`** (TypeScript config) is preferred over `next.config.js` in 16.
- Before starting, skim the official [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
  for the full breaking-changes list — `next/image` default behavior and a few legacy
  APIs (AMP, runtime config, `next lint`) were removed, and it's worth confirming none
  of the create-next-app defaults collide with those before Phase 1.
- **Tailwind CSS** — utility styling, no CSS-in-JS
- **Zustand** — global app state (corpus, model config, training status, model handle,
  generation state). Don't reach for Redux; this app's state graph is small.
- **shadcn/ui** — base primitives (button, input, slider, tabs, dialog) — customize
  don't default-skin them
- **Recharts** — loss curve, not a hand-rolled canvas chart (Next.js app, not a static
  artifact — use real chart libs)
- **idb-keyval** or raw IndexedDB — persist trained models + corpora client-side between
  sessions (TF.js supports `model.save('indexeddb://...')` natively)
- No backend database needed for v1. Everything lives in the browser. Don't add
  Postgres/Prisma/auth unless the user explicitly asks for multi-user persistence later.

---

## 3. Folder structure

```
/app
  /layout.tsx
  /page.tsx                        → main workbench (single-page app)
  /globals.css
/components
  /corpus/
    CorpusInput.tsx                 → textarea + file upload + sample corpus picker
    CorpusStats.tsx                 → char count, vocab size, unique tokens preview
  /model-config/
    ModelConfigPanel.tsx            → seqLen, embedDim, hiddenUnits, architecture picker
    ArchitecturePicker.tsx          → GRU | LSTM | tiny self-attention (stretch, see §8)
  /training/
    TrainingControls.tsx            → epochs, LR, batch size, start/pause/reset
    LossChart.tsx                   → Recharts line chart, live-updating
    TrainingLog.tsx                 → scrolling epoch log
  /generation/
    GenerationPanel.tsx             → prompt input, length, temperature slider
    GeneratedOutput.tsx             → streaming text output with cursor
    ProbabilityBars.tsx             → top-N next-token probabilities
  /visualization/
    NetworkActivityCanvas.tsx       → the live layer-by-layer activation diagram
    NetworkLegend.tsx
  /shared/
    Panel.tsx                       → consistent card/panel wrapper
    StatTile.tsx
/lib
  /model/
    tokenizer.ts                    → buildVocab(), encode(), decode()
    modelBuilder.ts                 → buildModel(config): tf.LayersModel
    trainer.ts                      → prepareSequences(), trainModel() with callbacks
    sampler.ts                      → sampleFromProbs(logits, temperature)
    activationProbes.ts             → buildProbeModels(model), getActivations(context)
  /persistence/
    modelStorage.ts                 → save/load to IndexedDB via tf.io
    corpusPresets.ts                → a few built-in sample corpora
  /store/
    useAppStore.ts                  → Zustand store (see §5)
  /types.ts                         → shared TS types (ModelConfig, TrainingState, etc.)
/public
  /samples/                         → .txt sample corpora (Shakespeare excerpt, code sample, etc.)
```

Keep `lib/model/*` framework-agnostic (no React imports) — it should be usable from a
test file or a future server route without modification. Components only orchestrate
and render; all TF.js logic lives in `/lib/model`.

---

## 4. Core data types (`/lib/types.ts`)

Define explicitly before writing components — don't let shape drift across files:

```typescript
export interface ModelConfig {
  architecture: 'gru' | 'lstm';       // 'attention' added in stretch phase
  seqLen: number;
  embedDim: number;
  hiddenUnits: number;
  epochs: number;
  learningRate: number;
  batchSize: number;
}

export interface TrainingState {
  status: 'idle' | 'preparing' | 'training' | 'trained' | 'error';
  currentEpoch: number;
  totalEpochs: number;
  lossHistory: { epoch: number; loss: number }[];
  vocabSize: number;
  errorMessage?: string;
}

export interface GenerationConfig {
  prompt: string;
  length: number;
  temperature: number;
}

export interface ActivationSnapshot {
  inputChars: string[];
  embedVector: number[];
  hiddenVector: number[];
  outputProbs: number[];       // full distribution, length = vocabSize
  sampledIndex: number;
}
```

---

## 5. State management (`/lib/store/useAppStore.ts`)

One Zustand store. Model handles (the actual `tf.LayersModel` instances) should **not**
live in React state/Zustand directly — TF.js tensors and models are mutable non-serializable
objects. Store them in a module-level singleton (`/lib/model/modelRegistry.ts`) and keep
only *status flags and metrics* in Zustand. This avoids re-render storms and stale-closure
bugs with tensors.

```typescript
// lib/model/modelRegistry.ts
let currentModel: tf.LayersModel | null = null;
let embedProbe: tf.LayersModel | null = null;
let gruProbe: tf.LayersModel | null = null;
let vocab: { charToIdx: Record<string, number>; idxToChar: Record<number, string> } | null = null;

export function setModel(model, embed, gru, v) { /* dispose old, assign new */ }
export function getModel() { return currentModel; }
export function disposeModel() { /* tf dispose calls */ }
// etc.
```

Zustand store holds: `corpus: string`, `modelConfig: ModelConfig`, `trainingState:
TrainingState`, `generationConfig: GenerationConfig`, `generatedText: string`,
`activationSnapshot: ActivationSnapshot | null`.

---

## 6. Key implementation notes (carry over from the validated prototype)

### Tokenizer (`lib/model/tokenizer.ts`)
Character-level for v1. Build vocab from unique characters in the corpus, sorted for
determinism. Export `encode(text, vocab): number[]` and `decode(ids, vocab): string`.
Leave a clearly marked extension point for a future BPE/subword tokenizer — don't
hardcode "char" assumptions throughout the codebase; route everything through
`encode`/`decode`.

### Model builder (`lib/model/modelBuilder.ts`)
```typescript
export function buildModel(config: ModelConfig, vocabSize: number): tf.LayersModel {
  const model = tf.sequential();
  model.add(tf.layers.embedding({ inputDim: vocabSize, outputDim: config.embedDim, inputLength: config.seqLen }));
  model.add(config.architecture === 'lstm'
    ? tf.layers.lstm({ units: config.hiddenUnits })
    : tf.layers.gru({ units: config.hiddenUnits }));
  model.add(tf.layers.dense({ units: vocabSize, activation: 'softmax' }));
  model.compile({ optimizer: tf.train.adam(config.learningRate), loss: 'categoricalCrossentropy' });
  return model;
}
```

### Trainer (`lib/model/trainer.ts`)
Sliding-window sequence prep identical to the prototype: for every window of `seqLen`
chars, input = window, target = next char. Use `model.fit` with `onEpochEnd` callback
to push loss into the Zustand store — **throttle UI updates** (e.g. only push every
epoch, not every batch) to avoid re-render thrash on longer runs. Always
`xs.dispose()` / `ys.dispose()` tensors after training. Guard against training on a
corpus shorter than `seqLen + 1` with a clear inline error, not a silent NaN loss.

### Activation probes (`lib/model/activationProbes.ts`)
After training completes, build two probe models exactly as in the prototype:
```typescript
const embedProbe = tf.model({ inputs: model.inputs, outputs: model.layers[0].output });
const gruProbe = tf.model({ inputs: model.inputs, outputs: model.layers[1].output });
```
Dispose and rebuild these any time the base model is retrained. Never let a stale probe
reference a disposed model — this is the most likely source of "tensor is disposed"
runtime errors in this app; centralize probe lifecycle inside `modelRegistry.ts` so it
can't be forgotten in a component.

### Sampler (`lib/model/sampler.ts`)
Temperature-scaled softmax sampling, ported directly from the prototype's
`sampleFromProbs`. Pure function, easily unit-testable — write a Jest test asserting
that temperature → 0 converges to argmax and temperature high flattens the distribution.

### Network visualization (`components/visualization/NetworkActivityCanvas.tsx`)
Port the canvas drawing logic from the prototype (`drawNetwork`) into a React component
that owns a `<canvas>` ref and redraws imperatively via `useEffect` when
`activationSnapshot` changes — do **not** try to make this declarative/SVG-in-React,
canvas imperative drawing is correct here for performance at 60fps-ish update rates.
Cap displayed nodes per layer (≈24 input, ≈22 embedding, ≈26 hidden, top-10 output) via
even-sampling exactly as in the prototype, and expose the true dimensionality as a label
so it's clear the diagram is a legible subsample, not the full layer.

---

## 7. Build phases (do these in order; each should be a working, demoable state)

**Phase 1 — Scaffold & static UI**
`create-next-app` with TypeScript + Tailwind + App Router. Build all panels with mock/
static data, no TF.js yet. Confirm layout, responsiveness, dark theme.

**Phase 2 — Tokenizer + model builder + training loop**
Wire up real TF.js training against a hardcoded sample corpus. Loss chart updates live.
No generation yet.

**Phase 3 — Generation + sampling**
Wire up the generation panel, temperature slider, streaming output, probability bars.

**Phase 4 — Activation visualization**
Add the probe models and the live network diagram.

**Phase 5 — Corpus input + presets + persistence**
File upload, textarea, a few bundled sample corpora, save/load trained models to
IndexedDB so a session survives a refresh.

**Phase 6 — Polish**
Error states (corpus too short, training NaN, WebGL unavailable → fall back to CPU
backend with a visible warning), loading states, mobile layout pass, accessibility pass
on sliders/inputs.

Do not proceed to the next phase until the current one runs cleanly — this app lives or
dies on the training loop actually working; get that rock-solid before layering UI on
top of it.

---

## 8. Stretch goals (only after phases 1–6 are solid)

- **Self-attention architecture option**: implement a minimal single-head attention
  block as a custom `tf.layers.Layer` subclass, offered alongside GRU/LSTM in
  `ArchitecturePicker`. This is genuinely more complex — don't attempt until the
  RNN path is fully stable.
- **Server-side training route** (`/app/api/train/route.ts`) using `tfjs-node` for
  larger corpora/longer runs than a browser tab can handle — return progress via
  Server-Sent Events, not a single blocking response.
- **BPE tokenizer** as an alternative to character-level.
- **Export trained model** as downloadable `tfjs_layers_model` files.
- **Multi-corpus comparison mode**: train two configs side-by-side, compare loss curves.

---

## 9. Explicit non-goals (say no if the user later asks for these without discussion)

- This is not a path to training an actual production-scale LLM — don't add distributed
  training, multi-GPU orchestration, or checkpointing infrastructure sized for that.
- No user auth / multi-tenant accounts in v1.
- No server-side corpus storage/database in v1 — everything is client-local.
