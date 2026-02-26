
/**
 * Hook: pre-tool-guard
 * Runs before a shell or MCP tool is invoked.
 *
 * Goals:
 * - Block destructive shell commands.
 * - Protect critical project files (schema, migrations, lockfiles, env).
 * - Prevent mass-deletes and dangerous git resets.
 *
 * This is a HARD safety layer.
 */

export type PreToolGuardContext = {
  toolName: string;
  args?: Record<string, unknown>;
};

export type PreToolGuardResult = {
  allow: boolean;
  message?: string;
};

const DANGEROUS_SHELL_PATTERNS: RegExp[] = [
  /rm\s+-rf/i,
  /git\s+reset\s+--hard/i,
  /git\s+clean\s+-fd/i,
  /git\s+checkout\s+--\s+\./i,
  /del\s+\/f\s+\/s\s+\/q/i,
  /format\s+[a-z]:/i,
];

const PROTECTED_PATH_PATTERNS: RegExp[] = [
  /packages\/db\/migrations/i,
  /schema\.prisma$/i,
  /package-lock\.json$/i,
  /pnpm-lock\.yaml$/i,
  /yarn\.lock$/i,
  /\.env$/i,
  /node_modules\//i,
];

function stringifyArgs(args?: Record<string, unknown>): string {
  if (!args) return "";
  try {
    return JSON.stringify(args);
  } catch {
    return String(args);
  }
}

function containsDangerousShell(command: string): boolean {
  return DANGEROUS_SHELL_PATTERNS.some((pattern) => pattern.test(command));
}

function touchesProtectedPath(payload: string): boolean {
  return PROTECTED_PATH_PATTERNS.some((pattern) => pattern.test(payload));
}

export async function run(context: PreToolGuardContext): Promise<PreToolGuardResult> {
  const { toolName, args } = context;

  if (!toolName) {
    return { allow: false, message: "Blocked: Missing toolName." };
  }

  const payload = stringifyArgs(args);

  // ---- SHELL SAFETY ----
  if (toolName.toLowerCase().includes("shell")) {
    if (containsDangerousShell(payload)) {
      return {
        allow: false,
        message:
          "Blocked: Destructive shell command detected (rm -rf / git reset --hard / git clean -fd). Explicit override required.",
      };
    }
  }

  // ---- FILE / MCP SAFETY ----
  if (
    toolName.toLowerCase().includes("delete") ||
    toolName.toLowerCase().includes("write") ||
    toolName.toLowerCase().includes("edit")
  ) {
    if (touchesProtectedPath(payload)) {
      return {
        allow: false,
        message:
          "Blocked: Attempt to modify protected file (schema, migrations, lockfile, env, node_modules). Explicit instruction required.",
      };
    }
  }

  // ---- MASS OPERATIONS GUARD ----
  if (payload.includes("**") || payload.includes("/*") && payload.includes("delete")) {
    return {
      allow: false,
      message:
        "Blocked: Potential mass file operation detected. Narrow the target scope.",
    };
  }

  return { allow: true };
}
