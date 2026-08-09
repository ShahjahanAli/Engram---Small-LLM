export interface CorpusPreset {
  id: string;
  name: string;
  description: string;
  path: string;
}

export const CORPUS_PRESETS: CorpusPreset[] = [
  {
    id: "shakespeare",
    name: "Shakespeare",
    description: "Excerpt from Hamlet — classic character-level demo",
    path: "/samples/shakespeare.txt",
  },
  {
    id: "code",
    name: "TypeScript snippets",
    description: "Small TS/JS code fragments for syntax learning",
    path: "/samples/code.txt",
  },
  {
    id: "nursery",
    name: "Nursery rhymes",
    description: "Short repetitive verse — trains quickly",
    path: "/samples/nursery.txt",
  },
];

export async function loadPreset(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load preset: ${path}`);
  return res.text();
}
