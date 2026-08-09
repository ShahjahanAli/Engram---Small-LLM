"use client";

import { Panel } from "@/components/shared/Panel";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ArchitecturePicker } from "@/components/model-config/ArchitecturePicker";
import { useAppStore } from "@/lib/store/useAppStore";
import { StatTile } from "@/components/shared/StatTile";

export function ModelConfigPanel() {
  const config = useAppStore((s) => s.modelConfig);
  const setModelConfig = useAppStore((s) => s.setModelConfig);
  const paramCount = useAppStore((s) => s.paramCount);
  const status = useAppStore((s) => s.trainingState.status);
  const locked = status === "training" || status === "preparing";

  return (
    <Panel
      title="Model config"
      description="Tokenizer → embedding → sequence encoder → softmax"
      actions={
        paramCount > 0 ? (
          <StatTile label="Params" value={paramCount.toLocaleString()} className="py-1" />
        ) : null
      }
    >
      <div className="space-y-4">
        <ArchitecturePicker
          value={config.architecture}
          disabled={locked}
          onChange={(architecture) => setModelConfig({ architecture })}
        />

        <Slider
          label="Sequence length"
          min={8}
          max={128}
          step={1}
          value={config.seqLen}
          disabled={locked}
          onValueChange={(seqLen) => setModelConfig({ seqLen })}
        />

        <Slider
          label="Embedding dim"
          min={8}
          max={128}
          step={4}
          value={config.embedDim}
          disabled={locked}
          onValueChange={(embedDim) => setModelConfig({ embedDim })}
        />

        <Slider
          label="Hidden units"
          min={16}
          max={256}
          step={8}
          value={config.hiddenUnits}
          disabled={locked}
          onValueChange={(hiddenUnits) => setModelConfig({ hiddenUnits })}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="lr">Learning rate</Label>
            <Input
              id="lr"
              type="number"
              min={0.0001}
              max={1}
              step={0.001}
              value={config.learningRate}
              disabled={locked}
              onChange={(e) =>
                setModelConfig({ learningRate: Number(e.target.value) || 0.01 })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="batch">Batch size</Label>
            <Input
              id="batch"
              type="number"
              min={8}
              max={512}
              step={8}
              value={config.batchSize}
              disabled={locked}
              onChange={(e) =>
                setModelConfig({ batchSize: Number(e.target.value) || 64 })
              }
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}
