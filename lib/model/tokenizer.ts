import type { Vocab } from "@/lib/types";

/**
 * Character-level tokenizer for v1.
 * Extension point: swap buildVocab / encode / decode for a BPE/subword
 * implementation later — callers should only use these functions, not
 * assume characters are the token unit.
 */

export function buildVocab(text: string): Vocab {
  const unique = Array.from(new Set(text.split(""))).sort();
  const charToIdx: Record<string, number> = {};
  const idxToChar: Record<number, string> = {};

  unique.forEach((ch, i) => {
    charToIdx[ch] = i;
    idxToChar[i] = ch;
  });

  return { charToIdx, idxToChar, size: unique.length };
}

export function encode(text: string, vocab: Vocab): number[] {
  const ids: number[] = [];
  for (const ch of text) {
    const idx = vocab.charToIdx[ch];
    if (idx === undefined) {
      // Unknown chars are skipped for v1 character tokenizer
      continue;
    }
    ids.push(idx);
  }
  return ids;
}

export function decode(ids: number[], vocab: Vocab): string {
  return ids.map((id) => vocab.idxToChar[id] ?? "").join("");
}

export function vocabPreview(vocab: Vocab, limit = 40): string {
  const chars = Object.keys(vocab.charToIdx)
    .slice(0, limit)
    .map((c) => (c === "\n" ? "\\n" : c === " " ? "␣" : c === "\t" ? "\\t" : c));
  const more = vocab.size > limit ? `… (+${vocab.size - limit})` : "";
  return chars.join(" ") + (more ? ` ${more}` : "");
}
