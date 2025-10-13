// A local verison of the webpage for easy of debugging
//
// To run this locally:
// 1. run zine (for webversion)
// 2. run `deno server.ts 8000`
// 3. set `lib.IS_OFFLINE = true` for the first run, then false

//run: <lib.js sed 's/^const lib/export const lib/' >tmp/lib.js; deno test --allow-read --allow-write --allow-net --allow-run %
// run: deno run --allow-run --allow-read %

import { lib } from "./tmp/lib.js";

// @TODO: Figure out how to have this script launch it, if it is not too complicated
//const cmd = new Deno.Command("deno", { args: ["run", "--allow-net", "--allow-read", "server.ts"] }).output();
//new Deno.Command("sleep", { args: ["0.3"] }).outputSync();
//console.log(await fetch("http://localhost:8000/tmp/app.js"));
//console.log(cmd);
//Deno.exit(0);

const default_repos = [
  "yueleshia/yueleshia.github.io",
  "ziglang/zig",
  "tweag/nickel",

  "yueleshia/admin",
];
lib.DEBUG_HOST = "localhost:8000";
lib.IS_OFFLINE = true;
lib.std.writeFileSync = Deno.writeFileSync;

const CACHE_MAP = new Map();
const RUN_DATA = new Array(default_repos.length * lib.RUNS_STORED_PER_REPO);
RUN_DATA.length = 0;
RUN_DATA.push({
  run_id: 15945519786,
  name: "Init",
  owner_repo: "yueleshia/yueleshia.github.io",
  path: ".github/workflows/build.yaml",
  run_attempt: 1,
  started_date: 1751123946000,
  updated_date: 1751123981000,
  actor: "yueleshia",
  jobs: [],
  ui_state: {},
});
CACHE_MAP.set(RUN_DATA[0].run_id, RUN_DATA[0]);

async function refresh() {
  for (let i = 0; i < default_repos.length; i += 1) {
    const err = await lib.refresh_run("", default_repos[i], CACHE_MAP, RUN_DATA)
    if (err) console.error(err);
  }

  // Reconstruct CACHE_MAP
  CACHE_MAP.clear();
  for (let i = 0; i < RUN_DATA.length; i += 1) {
    const post = RUN_DATA[i];
    CACHE_MAP.set(post.run_id, post);
  }
}

await refresh();

for (let i = 0; i < RUN_DATA.length; i += 1) {
  const run = RUN_DATA[i];
  const err = await lib.refresh_jobs("", run.owner_repo, run);
  if (err) console.error(err);
}
for (let i = 0; i < RUN_DATA[3].jobs.length; i += 1) {
  const job = RUN_DATA[3].jobs[i];
  console.log(job.conclusion, "|", job.workflow_name);
  for (let j = 0; j < job.steps.length; j += 1) {
    const step = job.steps[j];
    console.log("* ", step.conclusion, "|", step.name);
  }
  continue;
}
