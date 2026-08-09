"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel } from "@/components/shared/Panel";
import { useAppStore } from "@/lib/store/useAppStore";
import { CORPUS_PRESETS, loadPreset } from "@/lib/persistence/corpusPresets";
import { saveCorpus } from "@/lib/persistence/modelStorage";

export function CorpusInput() {
  const corpus = useAppStore((s) => s.corpus);
  const setCorpus = useAppStore((s) => s.setCorpus);
  const trainingStatus = useAppStore((s) => s.trainingState.status);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = trainingStatus === "training" || trainingStatus === "preparing";

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setCorpus(text);
    await saveCorpus(text);
  };

  const onPreset = async (path: string) => {
    const text = await loadPreset(path);
    setCorpus(text);
    await saveCorpus(text);
  };

  return (
    <Panel
      title="Corpus"
      description="Paste text, upload a .txt file, or load a sample"
    >
      <Tabs defaultValue="paste">
        <TabsList>
          <TabsTrigger value="paste">Paste</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="samples">Samples</TabsTrigger>
        </TabsList>

        <TabsContent value="paste">
          <Label htmlFor="corpus-text" className="sr-only">
            Training corpus
          </Label>
          <textarea
            id="corpus-text"
            value={corpus}
            disabled={busy}
            onChange={(e) => {
              setCorpus(e.target.value);
              void saveCorpus(e.target.value);
            }}
            placeholder="Paste your training text here…"
            className="h-40 w-full resize-y rounded-md border border-zinc-700 bg-zinc-950/80 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 disabled:opacity-50"
          />
        </TabsContent>

        <TabsContent value="upload" className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            Choose .txt file
          </Button>
          <p className="text-xs text-zinc-500">
            File contents replace the current corpus.
          </p>
        </TabsContent>

        <TabsContent value="samples" className="space-y-2">
          {CORPUS_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => void onPreset(p.path)}
              className="flex w-full flex-col rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-left transition hover:border-teal-700/50 hover:bg-zinc-900 disabled:opacity-50"
            >
              <span className="text-sm text-zinc-100">{p.name}</span>
              <span className="text-xs text-zinc-500">{p.description}</span>
            </button>
          ))}
        </TabsContent>
      </Tabs>
    </Panel>
  );
}
