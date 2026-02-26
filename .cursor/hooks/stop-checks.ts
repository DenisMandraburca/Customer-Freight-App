
/**
 * Hook: stop
 * Runs before the agent stops.
 *
 * Goals:
 * - Enforce verification before the agent claims completion.
 * - Run workspace-scoped checks based on the files changed in git.
 * - Enforce the 800-line hard limit repo-wide for changed files.
 *
 * Notes:
 * - This hook should be "light enough" for frequent runs, but strict enough to prevent false completion.
 * - Commands are best-effort and will be skipped if the required scripts are missing.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

export type StopChecksContext = {
  /** Reason the agent is about to stop */
  reason?: string;
};

export type StopChecksResult = {
  allowStop: boolean;
  message?: string;
};

const LINE_LIMIT = 800;

type Impact = {
  api: boolean;
  web: boolean;
  shared: boolean;
  db: boolean;
};

function detectImpact(files: string[]): Impact {
  const impact: Impact = { api: false, web: false, shared: false, db: false };
  for (const f of files) {
    const file = f.replace(/\\/g, "/");
    if (file.startsWith("apps/api/")) impact.api = true;
    if (file.startsWith("apps/web/")) impact.web = true;
    if (file.startsWith("packages/shared/")) impact.shared = true;
    if (file.startsWith("packages/db/") || file.startsWith("prisma/")) impact.db = true;
    if (file.endsWith("schema.prisma") || file.endsWith(".prisma")) impact.db = true;
  }
  return impact;
}

function isTextLikeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (!ext) return true;
  return ![
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".pdf",
    ".zip",
    ".gz",
    ".tar",
    ".lock",
    ".sqlite",
    ".db",
  ].includes(ext);
}

async function getChangedFiles(): Promise<string[]> {
  // Include staged + unstaged changes relative to HEAD.
  // If repo is in an unusual state, best-effort fallback.
  try {
    const { stdout } = await execFileAsync("git", ["diff", "--name-only", "HEAD"], { windowsHide: true });
    return stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function enforceLineLimitForFiles(files: string[]): Promise<void> {
  const offenders: Array<{ file: string; lines: number }> = [];

  for (const file of files) {
    if (!isTextLikeFile(file)) continue;
    try {
      const content = await fs.readFile(file, "utf8");
      const lineCount = content.split(/\r?\n/).length;
      if (lineCount > LINE_LIMIT) offenders.push({ file, lines: lineCount });
    } catch {
      // Ignore missing/deleted files
    }
  }

  if (offenders.length > 0) {
    const details = offenders
      .map((o) => `- ${o.file}: ${o.lines} lines (limit ${LINE_LIMIT})`)
      .join("\n");
    throw new Error(
      `Stop blocked: one or more files exceed ${LINE_LIMIT} lines. Split by responsibility.\n${details}`,
    );
  }
}

async function runCommand(cmd: string, args: string[]): Promise<void> {
  await execFileAsync(cmd, args, { windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
}

async function hasWorkspaceScript(workspace: string, script: string): Promise<boolean> {
  // Checks if `npm -w <workspace> run <script>` exists by listing scripts.
  // Best-effort: if this fails, assume script exists (don’t block).
  try {
    const { stdout } = await execFileAsync(
      "npm",
      ["-w", workspace, "run"],
      { windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
    );
    return stdout.includes(script);
  } catch {
    return true;
  }
}

async function verifyImpactedWorkspaces(impact: Impact): Promise<string[]> {
  const ran: string[] = [];

  // Shared is the highest risk — validate both apps.
  if (impact.shared) {
    if (await hasWorkspaceScript("packages/shared", "build")) {
      await runCommand("npm", ["-w", "packages/shared", "run", "build"]);
      ran.push("npm -w packages/shared run build");
    }
    if (await hasWorkspaceScript("apps/api", "typecheck")) {
      await runCommand("npm", ["-w", "apps/api", "run", "typecheck"]);
      ran.push("npm -w apps/api run typecheck");
    }
    if (await hasWorkspaceScript("apps/web", "typecheck")) {
      await runCommand("npm", ["-w", "apps/web", "run", "typecheck"]);
      ran.push("npm -w apps/web run typecheck");
    }
  }

  // DB changes — build db package (and optionally downstream typechecks if shared also changed handled above).
  if (impact.db) {
    // NOTE: workspace name may be @antigravity/db in some repos.
    // Try packages/db first; if it fails, the command will throw and block stop.
    if (await hasWorkspaceScript("packages/db", "build")) {
      await runCommand("npm", ["-w", "packages/db", "run", "build"]);
      ran.push("npm -w packages/db run build");
    }
  }

  // API
  if (impact.api && !impact.shared) {
    if (await hasWorkspaceScript("apps/api", "typecheck")) {
      await runCommand("npm", ["-w", "apps/api", "run", "typecheck"]);
      ran.push("npm -w apps/api run typecheck");
    }
    // test is optional but preferred
    if (await hasWorkspaceScript("apps/api", "test")) {
      await runCommand("npm", ["-w", "apps/api", "run", "test"]);
      ran.push("npm -w apps/api run test");
    }
  }

  // Web
  if (impact.web && !impact.shared) {
    if (await hasWorkspaceScript("apps/web", "typecheck")) {
      await runCommand("npm", ["-w", "apps/web", "run", "typecheck"]);
      ran.push("npm -w apps/web run typecheck");
    }
    if (await hasWorkspaceScript("apps/web", "test")) {
      await runCommand("npm", ["-w", "apps/web", "run", "test"]);
      ran.push("npm -w apps/web run test");
    }
  }

  return ran;
}

export async function run(context: StopChecksContext): Promise<StopChecksResult> {
  try {
    const changedFiles = await getChangedFiles();

    // If nothing changed, allow stop.
    if (changedFiles.length === 0) {
      return { allowStop: true };
    }

    // Enforce 800-line cap for changed files.
    await enforceLineLimitForFiles(changedFiles);

    // Determine which workspaces were impacted.
    const impact = detectImpact(changedFiles);

    // Run verification commands.
    const ran = await verifyImpactedWorkspaces(impact);

    return {
      allowStop: true,
      message: ran.length ? `Verification OK. Ran:\n${ran.map((c) => `- ${c}`).join("\n")}` : "Verification OK.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { allowStop: false, message };
  }
}
