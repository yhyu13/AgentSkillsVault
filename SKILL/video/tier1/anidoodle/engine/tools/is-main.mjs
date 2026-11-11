// IS-MAIN. Is this module the script node was asked to run, or was it imported by another tool?
// Compared by where the two paths really are: an installed skill is often reached through a link,
// and node resolves the module's own path through it while leaving the command line's as typed.
//   if (isMain(import.meta.url)) { ...command line... }
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
export const isMain = (url) => !!process.argv[1] && real(fileURLToPath(url)) === real(process.argv[1]);
