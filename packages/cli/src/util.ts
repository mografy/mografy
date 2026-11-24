// Small shared helpers for the CLI. Paths and how they are shown live in paths.ts.
import { access } from 'node:fs/promises';

/** Wait `ms` milliseconds. */
export const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
/** Whether a file or folder exists (any access error counts as missing). */
export const exists = (path: string) => access(path).then(() => true, () => false);
