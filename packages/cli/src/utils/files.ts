import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

export async function checkDirectory(directory: string): Promise<void> {
  try {
    const stat = await lstat(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`Expected a regular directory: ${directory}`);
    }
  } catch (error) {
    if (!hasCode(error, "ENOENT")) throw error;
  }
}

export async function readSource(root: string, folder: string, filename: string): Promise<string | undefined> {
  await checkDirectory(path.join(root, "src"));
  await checkDirectory(path.join(root, "src", folder));
  const target = path.join(root, "src", folder, filename);
  try {
    const stat = await lstat(target);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Expected a regular file: ${target}`);
    return await readFile(target, "utf8");
  } catch (error) {
    if (hasCode(error, "ENOENT")) return undefined;
    throw error;
  }
}

export async function writeSource(root: string, folder: string, filename: string, source: string): Promise<string> {
  const src = path.resolve(root, "src");
  const directory = path.resolve(src, folder);
  const target = path.resolve(directory, filename);
  if (!target.startsWith(src + path.sep)) throw new Error("Generator path must stay inside src.");
  await checkDirectory(src);
  await checkDirectory(directory);
  await mkdir(directory, { recursive: true });
  const relative = `src/${folder}/${filename}`;
  try {
    await writeFile(target, source, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (hasCode(error, "EEXIST")) throw new Error(`File already exists: ${relative}`);
    throw error;
  }
  return relative;
}
