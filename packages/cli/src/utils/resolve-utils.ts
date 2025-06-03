import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';
// import { isMonorepoContext } from '@/src/utils'; // Replaced by UserEnvironment
import { UserEnvironment } from './user-environment';

/**
 * Expands a file path starting with `~` to the project directory.
 *
 * @param filepath - The path to expand.
 * @returns The expanded path.
 */
export function expandTildePath(
  filepath: string,
  projectRootForTilde: string = process.cwd()
): string {
  if (filepath && filepath.startsWith('~')) {
    // If ~ means project root, use projectRootForTilde. If it means OS home, os.homedir() would be used.
    // Assuming ~ means project root in this context based on previous behavior with cwd.
    return path.join(projectRootForTilde, filepath.slice(1));
  }
  return filepath;
}

/**
 * Resolves the path to the `.env` file, prioritizing the project root first,
 * then searching upward from the start directory.
 *
 * @param startDir - Directory to begin the lookup (default: current working directory).
 * @param boundaryDir - Optional directory at which to stop searching upward.
 * @returns The path to the found `.env` file, or a path to `.env` in startDir if none found.
 */
export function resolveEnvFile(startDir: string = process.cwd(), boundaryDir?: string): string {
  const root = path.resolve(startDir);
  
  // First, try to find the project root by looking for common indicators
  // Look for package.json, .git, or other project root indicators
  let projectRoot = root;
  let current = root;
  let topMostGitModules = null;
  
  // Search upward to find the project root
  while (true) {
    const hasPackageJson = existsSync(path.join(current, 'package.json'));
    const hasGitDir = existsSync(path.join(current, '.git'));
    const hasGitModules = existsSync(path.join(current, '.gitmodules'));
    
    // If we find project indicators, this might be the project root
    if (hasPackageJson || hasGitDir || hasGitModules) {
      projectRoot = current;
      
      // Keep track of the topmost .gitmodules file
      if (hasGitModules) {
        topMostGitModules = current;
      }
    }
    
    const parent = path.dirname(current);
    if (parent === current) {
      break; // Reached filesystem root
    }
    current = parent;
  }
  
  // Use the topmost .gitmodules location as the project root if found
  if (topMostGitModules) {
    projectRoot = topMostGitModules;
  }
  
  // First priority: Check for .env in the detected project root
  const projectRootEnv = path.join(projectRoot, '.env');
  if (existsSync(projectRootEnv)) {
    return projectRootEnv;
  }
  
  // Second priority: Search upward from the start directory
  current = root;
  while (true) {
    const candidate = path.join(current, '.env');
    if (existsSync(candidate)) {
      return candidate;
    }
    
    // Stop if we've reached the boundary directory
    if (boundaryDir && current === path.resolve(boundaryDir)) {
      break;
    }
    
    const parent = path.dirname(current);
    // Stop if we've reached the filesystem root
    if (parent === current) {
      break;
    }
    current = parent;
  }
  
  // If no .env file found, return the default path in the start directory
  return path.join(root, '.env');
}

/**
 * Resolves the directory used for PGlite database storage.
 *
 * Resolution order:
 * 1. The `dir` argument if provided.
 * 2. The `PGLITE_DATA_DIR` environment variable.
 * 3. The `fallbackDir` argument if provided.
 * 4. `./.elizadb` relative to the current working directory.
 *
 * @param dir - Optional directory preference.
 * @param fallbackDir - Optional fallback directory when env var is not set.
 * @returns The resolved data directory with any tilde expanded.
 */
export async function resolvePgliteDir(dir?: string, fallbackDir?: string): Promise<string> {
  const userEnv = UserEnvironment.getInstance();
  const pathsInfo = await userEnv.getPathInfo();
  const projectRoot = pathsInfo.monorepoRoot || process.cwd(); // Base directory should be monorepo root or cwd

  // Use the envFilePath from UserEnvironment which is already correctly resolved
  if (pathsInfo.envFilePath && existsSync(pathsInfo.envFilePath)) {
    dotenv.config({ path: pathsInfo.envFilePath });
  }

  // The fallbackDir passed from getElizaDirectories will be monorepoRoot + '.elizadb' or similar.
  // If fallbackDir is not provided (e.g. direct call to resolvePgliteDir),
  // then we construct the default path using projectRoot.
  const defaultBaseDir = path.join(projectRoot, '.elizadb');

  const base = dir ?? process.env.PGLITE_DATA_DIR ?? fallbackDir ?? defaultBaseDir;

  // Pass projectRoot for tilde expansion, assuming ~ means project root.
  return expandTildePath(base, projectRoot);
}
