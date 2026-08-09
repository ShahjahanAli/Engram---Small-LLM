"use client";

import dynamic from "next/dynamic";

const Workbench = dynamic(
  () => import("@/components/Workbench").then((m) => m.Workbench),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        Loading Engram workbench…
      </div>
    ),
  }
);

export function WorkbenchLoader() {
  return <Workbench />;
}
