// Packages the itch.io HTML5 build (dist-itch/) into itch/<package name>-itch.zip
// and checks it against itch.io's HTML5 upload rules
// (https://itch.io/docs/creators/html5):
//
// - index.html sits at the zip root;
// - no more than 1,000 files and 500 MB once extracted, no file over 200 MB,
//   no path longer than 240 characters;
// - index.html references no root-absolute paths ("/..."), which point outside
//   the game on itch.io and fail.
//
// The zip is read back after writing, so the root check runs on the real file.
// Run with `npm run build:itch`. Exits non-zero on any failure.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { unzipSync, zipSync } from "fflate";

const root = process.cwd();
const distDir = join(root, process.argv[2] ?? "dist-itch");
const outDir = join(root, "itch");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const zipPath = join(outDir, `${pkg.name}-itch.zip`);

const MB = 1024 * 1024;
const LIMITS = { files: 1000, extractedBytes: 500 * MB, fileBytes: 200 * MB, pathLength: 240 };
// Uploads are stamped with a fixed date so the same build gives the same zip.
const MTIME = new Date("2026-01-01T00:00:00Z");

function fail(message) {
  console.error(`build:itch failed: ${message}`);
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

if (!existsSync(join(distDir, "index.html"))) fail(`${relative(root, distDir)}/index.html is missing. Run the itch build first.`);

const problems = [];
const entries = {};
for (const file of walk(distDir).sort()) {
  const path = relative(distDir, file).split(sep).join("/");
  if (path.length > LIMITS.pathLength) problems.push(`path longer than ${LIMITS.pathLength} characters: ${path}`);
  entries[path] = [readFileSync(file), { mtime: MTIME }];
}

const indexHtml = entries["index.html"][0].toString("utf8");
const absoluteRefs = [...indexHtml.matchAll(/\b(?:src|href)\s*=\s*["'](\/(?!\/)[^"']*)["']/gi)].map((match) => match[1]);
if (absoluteRefs.length > 0) problems.push(`index.html has root-absolute paths, which fail on itch.io: ${absoluteRefs.join(", ")}`);

mkdirSync(outDir, { recursive: true });
writeFileSync(zipPath, zipSync(entries, { level: 9 }));

// Read the zip back and check what itch.io will actually receive.
const unzipped = unzipSync(readFileSync(zipPath));
const files = Object.entries(unzipped).filter(([name]) => !name.endsWith("/"));
const extractedBytes = files.reduce((sum, [, data]) => sum + data.length, 0);
const [largestName, largestData] = files.reduce((best, entry) => (entry[1].length > best[1].length ? entry : best));
const rootIndex = Object.hasOwn(unzipped, "index.html");

if (!rootIndex) problems.push("index.html is not at the zip root");
if (files.length > LIMITS.files) problems.push(`${files.length} files, itch.io limit ${LIMITS.files}`);
if (extractedBytes > LIMITS.extractedBytes) problems.push(`${extractedBytes} bytes extracted, itch.io limit ${LIMITS.extractedBytes}`);
if (largestData.length > LIMITS.fileBytes) problems.push(`${largestName} is ${largestData.length} bytes, itch.io per-file limit ${LIMITS.fileBytes}`);

const zipBytes = statSync(zipPath).size;
const mb = (bytes) => `${(bytes / MB).toFixed(2)} MB`;
const report = [
  `zip: ${relative(root, zipPath).split(sep).join("/")}`,
  `zip size: ${zipBytes} bytes (${mb(zipBytes)})`,
  `files: ${files.length} (limit ${LIMITS.files})`,
  `extracted size: ${extractedBytes} bytes (${mb(extractedBytes)}, limit 500 MB)`,
  `largest file: ${largestName} (${mb(largestData.length)}, limit 200 MB)`,
  `index.html at zip root: ${rootIndex ? "yes" : "NO"}`,
  `root-absolute paths in index.html: ${absoluteRefs.length === 0 ? "none" : absoluteRefs.join(", ")}`,
];
console.log(report.join("\n"));

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### itch.io zip\n\n${report.map((line) => `- ${line}`).join("\n")}\n`);
}

if (problems.length > 0) fail(problems.join("; "));
console.log("build:itch ok");
