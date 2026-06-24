import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// dist/statusline/sparkline.mjs
var GLYPHS = ["\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587", "\u2588"];
function sparkline(samples, width) {
  if (samples.length === 0 || width <= 0)
    return "";
  if (samples.length === 1)
    return GLYPHS[0];
  let series;
  if (samples.length === width) {
    series = samples;
  } else {
    series = [];
    for (let i = 0; i < width; i++) {
      const srcIdx = Math.floor(i * samples.length / width);
      series.push(samples[srcIdx]);
    }
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min;
  if (range === 0)
    return GLYPHS[0].repeat(width);
  return series.map((v) => {
    const normalized = (v - min) / range;
    const idx = Math.min(GLYPHS.length - 1, Math.floor(normalized * GLYPHS.length));
    return GLYPHS[idx];
  }).join("");
}

// dist/statusline/ansi.mjs
var RESET = "\x1B[0m";
var YELLOW = "\x1B[33m";
var RED = "\x1B[31m";
var GREEN = "\x1B[32m";
var CYAN = "\x1B[36m";
var DIM = "\x1B[2m";
var Severity;
(function(Severity2) {
  Severity2["none"] = "none";
  Severity2["warn"] = "warn";
  Severity2["crit"] = "crit";
})(Severity || (Severity = {}));
function colorize(text, severity) {
  switch (severity) {
    case Severity.warn:
      return `${YELLOW}${text}${RESET}`;
    case Severity.crit:
      return `${RED}${text}${RESET}`;
    default:
      return `${GREEN}${text}${RESET}`;
  }
}
function dim(text) {
  return `${DIM}${text}${RESET}`;
}
function cyan(text) {
  return `${CYAN}${text}${RESET}`;
}
function severityFromThresholds(value, warn, crit) {
  if (value >= crit)
    return Severity.crit;
  if (value >= warn)
    return Severity.warn;
  return Severity.none;
}

// dist/statusline/subagent-statusline.mjs
var DEFAULT_CONTEXT_SIZE = 2e5;
var SPARK_WIDTH = 8;
function renderRow(task, contextSize) {
  const pct = Math.round(task.tokenCount / contextSize * 100);
  const severity = severityFromThresholds(pct, 50, 80);
  const spark = sparkline(task.tokenSamples ?? [], SPARK_WIDTH);
  const tokenStr = task.tokenCount >= 1e3 ? `${Math.floor(task.tokenCount / 1e3)}k` : String(task.tokenCount).padStart(4, " ");
  const head = `${cyan("\u2699")} ${task.name}  ${dim(task.description)}`;
  const tail = `  ${colorize(spark, severity)} ${colorize(`${pct}%`, severity)}  ${dim(tokenStr)}`;
  return head + tail;
}
function renderSubagentRows(input) {
  const contextSize = input.context_window?.context_window_size ?? DEFAULT_CONTEXT_SIZE;
  return input.tasks.map((task) => JSON.stringify({ id: task.id, content: renderRow(task, contextSize) }));
}
var isDirectRun = typeof process !== "undefined" && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isDirectRun) {
  let buf = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk) => {
    buf += chunk;
  });
  process.stdin.on("end", () => {
    try {
      const input = JSON.parse(buf);
      const lines = renderSubagentRows(input);
      if (lines.length > 0)
        process.stdout.write(lines.join("\n") + "\n");
    } catch {
    }
  });
}
export {
  Severity,
  renderSubagentRows
};
