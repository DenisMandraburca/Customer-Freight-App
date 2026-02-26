/**
 * Hook: afterFileEdit
 * Runs after a file is edited (e.g. by the agent).
 *
 * Goals:
 * - Enforce the 800-line hard limit early.
 * - Apply safe, fast formatting for touched files.
 * - Avoid heavy workspace-wide checks (those belong in stop-checks).
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

export type AfterFileEditContext = {
  /** Absolute or repo-relative path to the file that was edited */
  path: string;
  /** Optional: previous content for diff-based logic */
  previousContent?: string;
};

export type AfterFileEditResult = {
  ok: boolean;
  message?: string;
};

const LINE_LIMIT = 800;

function isTextLikeFile(filePath: string): boolean {
  // Skip binary-ish and generated artifacts.
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

function shouldPrettierFormat(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".vue",
    ".json",
    ".md",
    ".css",
    ".scss",
    ".html",
    ".yml",
    ".yaml",
  ].includes(ext);
}

function isPrismaSchema(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === ".prisma";
}

async function enforceLineLimit(filePath: string): Promise<void> {
  if (!isTextLikeFile(filePath)) return;

  const content = await fs.readFile(filePath, "utf8");
  const lineCount = content.split(/\r?\n/).length;

  if (lineCount > LINE_LIMIT) {
    const overBy = lineCount - LINE_LIMIT;
    throw new Error(
      `File exceeds ${LINE_LIMIT} lines (${lineCount}, +${overBy}). Split by responsibility (components/composables/routes/services/repos).`,
    );
  }
}

async function runPrettier(filePath: string): Promise<void> {
  // Use npx so we respect repo-local prettier.
  // Keep this fast and file-scoped.
  await execFileAsync("npx", ["prettier", "--write", filePath], {
    windowsHide: true,
  });
}

async function runPrismaFormat(schemaPath: string): Promise<void> {
  // Prefer Prisma's formatter for schema files.
  await execFileAsync("npx", ["prisma", "format", "--schema", schemaPath], {
    windowsHide: true,
  });
}

export async function run(context: AfterFileEditContext): Promise<AfterFileEditResult> {
  const filePath = context?.path;

  if (!filePath) {
    return { ok: false, message: "Missing path" };
  }

  try {
    // 1) Enforce 800-line limit (hard guardrail).
    await enforceLineLimit(filePath);

    // 2) Format (file-scoped). Prefer Prisma formatter for schema.
    if (isPrismaSchema(filePath)) {
      await runPrismaFormat(filePath);
    } else if (shouldPrettierFormat(filePath)) {
      await runPrettier(filePath);
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message };
  }
}
