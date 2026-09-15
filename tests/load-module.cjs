const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "../src");
function load(file, mocks = {}, globals = {}) {
  const cache = new Map();
  function read(filename) {
    filename = path.resolve(filename);
    if (!path.extname(filename)) filename += ".ts";
    if (cache.has(filename)) return cache.get(filename).exports;
    if (filename.endsWith(".json"))
      return JSON.parse(fs.readFileSync(filename, "utf8"));
    const mod = { exports: {} };
    cache.set(filename, mod);
    const req = (name) => {
      if (name in mocks) return mocks[name];
      if (name.startsWith("@/")) return read(path.join(root, name.slice(2)));
      if (name.startsWith(".")) {
        const target = path.resolve(path.dirname(filename), name);
        const alias =
          "@/" +
          path
            .relative(root, target)
            .replaceAll("\\", "/")
            .replace(/\.tsx?$/, "");
        return alias in mocks ? mocks[alias] : read(target);
      }
      return require(name);
    };
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInNewContext(
      code,
      {
        exports: mod.exports,
        module: mod,
        require: req,
        process,
        Buffer,
        URL,
        URLSearchParams,
        console,
        fetch,
        AbortSignal,
        ...globals,
      },
      { filename },
    );
    return mod.exports;
  }
  return read(path.join(root, file));
}
module.exports = load;
