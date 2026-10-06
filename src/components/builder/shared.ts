"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { cleanError } from "@/lib/format";

export type BuilderData = NonNullable<FunctionReturnType<typeof api.projects.get>>;
export type ProjectPatch = FunctionArgs<typeof api.projects.update>["patch"];

export function useSave(id: Id<"projects">) {
  const update = useMutation(api.projects.update);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (patch: ProjectPatch) => {
      setStatus("saving");
      setError(null);
      try {
        await update({ id, patch });
        setStatus("saved");
        setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
        return true;
      } catch (e) {
        setError(cleanError(e));
        setStatus("error");
        return false;
      }
    },
    [id, update],
  );

  return { save, status, error };
}
