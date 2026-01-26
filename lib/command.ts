import fs from "node:fs";
import path from "node:path";
import {
  splitPath as platformSplitPath,
  joinPathEntries,
  getDefaultBinDirs,
} from "./platform";

function uniq(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

// Re-export for convenience
export { platformSplitPath, joinPathEntries, getDefaultBinDirs };

export function buildAugmentedPath(extraDirs: string[] = []): string {
  const existing = platformSplitPath(process.env.PATH);
  const dirs = uniq([...extraDirs, ...getDefaultBinDirs(), ...existing]);
  return joinPathEntries(dirs);
}

export function createSubprocessEnv(extra: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...extra,
    PATH: buildAugmentedPath(platformSplitPath(extra.PATH)),
  } as NodeJS.ProcessEnv;
}

export function resolveCommand(command: string, extraDirs: string[] = []): string | null {
  const trimmed = command.trim();
  if (!trimmed) return null;

  if (trimmed.includes("/")) {
    try {
      fs.accessSync(trimmed, fs.constants.X_OK);
      return trimmed;
    } catch {
      return null;
    }
  }

  const searchDirs = platformSplitPath(buildAugmentedPath(extraDirs));
  for (const dir of searchDirs) {
    const candidate = path.join(dir, trimmed);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // continue
    }
  }

  return null;
}
