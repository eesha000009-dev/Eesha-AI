import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { getAuthUserId, unauthorizedResponse } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/app/workspace';

// ━━━ SECURITY: Command allowlist ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ONLY these commands are permitted. Everything else is blocked.
// This is more secure than a blocklist — new/dangerous commands are automatically rejected.
const ALLOWED_COMMANDS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /^ls\s*/, description: 'List files' },
  { pattern: /^ls$/, description: 'List files' },
  { pattern: /^cat\s+/, description: 'Read file' },
  { pattern: /^head\s+/, description: 'Read file head' },
  { pattern: /^tail\s+/, description: 'Read file tail' },
  { pattern: /^less\s+/, description: 'Read file' },
  { pattern: /^wc\s+/, description: 'Count words/lines' },
  { pattern: /^file\s+/, description: 'Check file type' },
  { pattern: /^find\s+/, description: 'Find files' },
  { pattern: /^tree\s*/, description: 'Tree listing' },
  { pattern: /^node\s+/, description: 'Run Node.js script' },
  { pattern: /^npx\s+/, description: 'Run npx package' },
  { pattern: /^npm\s+(run|start|test|build|info|list|view|init)/, description: 'npm safe commands' },
  { pattern: /^npx\s+prisma\s+/, description: 'Prisma CLI' },
  { pattern: /^tsc\s*/, description: 'TypeScript compiler' },
  { pattern: /^python3?\s+/, description: 'Run Python script' },
  { pattern: /^git\s+(status|log|diff|branch|show|remote|init|add|commit|stash|tag|describe)/, description: 'Git safe commands' },
  { pattern: /^grep\s+/, description: 'Search text' },
  { pattern: /^rg\s+/, description: 'Ripgrep search' },
  { pattern: /^sed\s+/, description: 'Text substitution' },
  { pattern: /^awk\s+/, description: 'Text processing' },
  { pattern: /^sort\s*/, description: 'Sort lines' },
  { pattern: /^uniq\s*/, description: 'Unique lines' },
  { pattern: /^echo\s+/, description: 'Print text' },
  { pattern: /^pwd\s*/, description: 'Print working directory' },
  { pattern: /^whoami\s*/, description: 'Current user' },
  { pattern: /^mkdir\s+/, description: 'Create directory' },
  { pattern: /^touch\s+/, description: 'Create empty file' },
  { pattern: /^cp\s+/, description: 'Copy files' },
  { pattern: /^mv\s+/, description: 'Move/rename files' },
  { pattern: /^rm\s+[^-]/, description: 'Remove files (no flags)' },
  { pattern: /^npm\s+install\s+(?!-g)/, description: 'npm local install' },
  { pattern: /^pip3?\s+install\s+(?!--user|-g|--global)/, description: 'pip local install' },
];

function isCommandSafe(command: string): { safe: boolean; reason?: string } {
  const trimmed = command.trim();

  for (const { pattern } of ALLOWED_COMMANDS) {
    if (pattern.test(trimmed)) {
      // Block pipe chains and shell operators
      if (/[|;&`$]/.test(trimmed)) {
        return { safe: false, reason: 'Pipe chains and shell operators are not allowed' };
      }
      if (/>\s*\//.test(trimmed)) {
        return { safe: false, reason: 'Output redirection outside workspace is not allowed' };
      }
      return { safe: true };
    }
  }

  return { safe: false, reason: `Command not in allowlist. Only safe development commands are permitted.` };
}

// POST — execute a command in the workspace
export async function POST(req: NextRequest) {
  // ━━━ SECURITY: Authenticate user ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const userId = await getAuthUserId();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const { command, cwd } = await req.json();

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }

    // ━━━ SECURITY: Validate command against blocklist ━━━━━━━━━━━━━━━━━━━
    const { safe, reason } = isCommandSafe(command);
    if (!safe) {
      console.warn(`[SECURITY] Blocked command from user ${userId}: "${command}" — ${reason}`);
      return NextResponse.json({
        stdout: '',
        stderr: `Command blocked for security: ${reason}`,
        exitCode: 1,
      });
    }

    // ━━━ SECURITY: Limit command length ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (command.length > 500) {
      return NextResponse.json({
        stdout: '',
        stderr: 'Command too long. Maximum 500 characters allowed.',
        exitCode: 1,
      });
    }

    const path = require('path');
    const workingDir = cwd ? path.resolve(WORKSPACE_ROOT, cwd) : WORKSPACE_ROOT;

    // ━━━ SECURITY: Ensure working directory is within workspace ━━━━━━━━━━
    // Use path.sep to prevent bypass via similarly-named directories
    if (!workingDir.startsWith(WORKSPACE_ROOT + path.sep) && workingDir !== WORKSPACE_ROOT) {
      return NextResponse.json({
        stdout: '',
        stderr: 'Working directory must be within the workspace.',
        exitCode: 1,
      });
    }

    // ━━━ SECURITY: Execute with restricted environment ━━━━━━━━━━━━━━━━━━
    const safeEnv: Record<string, string> = {
      PATH: process.env.PATH || '/usr/bin:/bin',
      HOME: WORKSPACE_ROOT,
      TERM: 'dumb',
      LANG: 'en_US.UTF-8',
      USER: 'workspace',
    };
    // Do NOT pass API keys, database URLs, or other secrets to child processes

    return new Promise((resolve) => {
      exec(
        command,
        {
          cwd: workingDir,
          timeout: 15000,
          maxBuffer: 1024 * 1024, // 1MB
          env: safeEnv,
          // Run as non-root if possible
          ...(process.getuid?.() === 0 ? { uid: 1000 } : {}),
        },
        (error, stdout, stderr) => {
          // ━━━ SECURITY: Sanitize output to prevent info leakage ━━━━━━━━━
          const sanitizeOutput = (output: string): string => {
            // Remove any potential API keys or tokens from output
            return output
              .replace(/nvapi-[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]')
              .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[REDACTED_JWT]')
              .replace(/hf_[a-zA-Z0-9]+/g, '[REDACTED_TOKEN]')
              .replace(/postgresql:\/\/[^\s]+/g, '[REDACTED_DB_URL]');
          };

          resolve(NextResponse.json({
            stdout: sanitizeOutput(stdout || ''),
            stderr: sanitizeOutput(stderr || ''),
            exitCode: error ? error.code || 1 : 0,
          }));
        }
      );
    });
  } catch (error) {
    console.error('Terminal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
