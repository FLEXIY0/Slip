#!/usr/bin/env node
/**
 * Fetch static FFmpeg + ffprobe binaries and place them as Tauri sidecars in
 * src-tauri/binaries/ named `<tool>-<target-triple><ext>`. Run before
 * `tauri build` on platforms that bundle FFmpeg (Windows).
 *
 * Usage: node scripts/fetch-ffmpeg.mjs [target-triple]
 *   defaults to the host's Rust target triple.
 */
import { execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, copyFile, chmod, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src-tauri", "binaries");

// Static build sources per Rust target triple.
const SOURCES = {
  "x86_64-pc-windows-msvc": {
    url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
    ext: ".exe",
  },
  "x86_64-unknown-linux-gnu": {
    url: "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz",
    ext: "",
  },
};

function hostTriple() {
  const { platform, arch } = process;
  if (platform === "win32") return "x86_64-pc-windows-msvc";
  if (platform === "linux") return "x86_64-unknown-linux-gnu";
  if (platform === "darwin")
    return arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
  throw new Error(`Unsupported host platform: ${platform}`);
}

async function download(url, dest) {
  console.log(`↓ ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  await new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    Readable.fromWeb(res.body).pipe(file);
    file.on("finish", resolve);
    file.on("error", reject);
  });
}

async function findRecursive(dir, name) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = await findRecursive(full, name);
      if (hit) return hit;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

async function main() {
  const triple = process.argv[2] || hostTriple();
  const source = SOURCES[triple];
  if (!source) {
    console.error(`No FFmpeg source configured for target: ${triple}`);
    console.error(`Configured: ${Object.keys(SOURCES).join(", ")}`);
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });
  const work = path.join(tmpdir(), `slip-ffmpeg-${Date.now()}`);
  await mkdir(work, { recursive: true });
  const archive = path.join(work, path.basename(source.url));

  await download(source.url, archive);

  // `tar` (libarchive/bsdtar) handles both .zip and .tar.xz on all runners.
  console.log("⇲ extracting…");
  execFileSync("tar", ["-xf", archive, "-C", work], { stdio: "inherit" });

  for (const tool of ["ffmpeg", "ffprobe"]) {
    const binName = tool + source.ext;
    const found = await findRecursive(work, binName);
    if (!found) throw new Error(`${binName} not found in archive`);
    const target = path.join(OUT, `${tool}-${triple}${source.ext}`);
    await copyFile(found, target);
    if (source.ext === "") await chmod(target, 0o755);
    const { size } = await stat(target);
    console.log(`✓ ${path.relative(ROOT, target)} (${(size / 1_048_576).toFixed(1)} MB)`);
  }

  await rm(work, { recursive: true, force: true });
  console.log("FFmpeg sidecars ready.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
