"use client";

import { useMemo } from "react";
import { Panel } from "@/components/shared/Panel";
import { StatTile } from "@/components/shared/StatTile";
import { useAppStore } from "@/lib/store/useAppStore";
import { buildVocab, vocabPreview } from "@/lib/model/tokenizer";
import { MAX_TRAIN_SAMPLES } from "@/lib/model/trainer";

export function CorpusStats() {
  const corpus = useAppStore((s) => s.corpus);
  const seqLen = useAppStore((s) => s.modelConfig.seqLen);

  const stats = useMemo(() => {
    if (!corpus) {
      return { chars: 0, vocabSize: 0, sequences: 0, used: 0, capped: false, preview: "—" };
    }
    const vocab = buildVocab(corpus);
    const sequences = Math.max(0, corpus.length - seqLen);
    const used = Math.min(sequences, MAX_TRAIN_SAMPLES);
    return {
      chars: corpus.length,
      vocabSize: vocab.size,
      sequences,
      used,
      capped: sequences > MAX_TRAIN_SAMPLES,
      preview: vocabPreview(vocab, 32),
    };
  }, [corpus, seqLen]);

  return (
    <Panel title="Corpus stats" description="Character-level vocabulary">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Chars" value={stats.chars.toLocaleString()} />
        <StatTile label="Vocab" value={stats.vocabSize} />
        <StatTile
          label="Sequences"
          value={
            stats.capped
              ? `${stats.used.toLocaleString()} / ${stats.sequences.toLocaleString()}`
              : stats.sequences.toLocaleString()
          }
          hint={stats.capped ? `capped at ${MAX_TRAIN_SAMPLES}` : `window ${seqLen}`}
        />
      </div>
      <div className="mt-3">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
          Tokens preview
        </div>
        <p className="break-all font-mono text-[11px] leading-relaxed text-zinc-400">
          {stats.preview}
        </p>
      </div>
    </Panel>
  );
}
