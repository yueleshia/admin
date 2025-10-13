//@ts-check

/**
 * @typedef Actor     {object}
 * @property login    {string}
 * @property html_url {string}

 * @typedef CacheLine {object}
 * @property run_id        {number}
 * @property name          {string}
 * @property owner_repo    {string}
 * @property path          {string}
 * @property run_attempt   {number}
 * @property started_date  {number}
 * @property updated_date  {number}
 * @property actor         {Actor}
 * @property conclusion    {string | null}
 *
 * @property jobs          {object[]}
 * @property ui_state      {object}
 * //@property //commit_id: "", @TODO: How to link to tag/pr/branch/commit correctly
 **/

//* @property jobs: {},
//* @property ui_state: {},

const lib = {
  RUNS_STORED_PER_REPO: 10,
  IS_OFFLINE: false,
  DEBUG_HOST: "localhost:8000",
  std: {
    /**
     * @param _path  {string}
     * @param _value {Uint8Array}
     */
    writeFileSync(_path, _value) {},
  },

  /**
   * @param x {any}
   */
  is_string(x) { return typeof x === "string"; }, // || x instanceof String; }
  /**
   * @param fn {function (any): boolean}
   * @param x {any}
   * @param field_name {string}
   */
  validate(fn, x, field_name) {
    if (fn(x)) { return x; } else { throw new TypeError(field_name); }
  },

  /**
   * @param owner_repo {string}
   * @param runs       {any[]}
   * @param data       {CacheLine[]}
   */
  parse_runs(owner_repo, runs, data) {
    let run;
    try {
      for (let i = 0; i < lib.RUNS_STORED_PER_REPO; i += 1) {
        run = runs[i];
        const a = {
          run_id: lib.validate(Number.isInteger, run.id, "id"),
          name: lib.validate(lib.is_string, run.display_title, "display_title"),
          owner_repo: lib.validate(lib.is_string, owner_repo, "<param>"),
          path: lib.validate(lib.is_string, run.path, "path"),
          run_attempt: lib.validate(Number.isInteger, run.run_attempt, "run_attempt"),
          started_date: lib.validate(Number.isInteger, Date.parse(run.run_started_at), "run_started_at"),
          updated_date: lib.validate(Number.isInteger, Date.parse(run.updated_at), "updated_at"),
          actor: {
            login: lib.validate(lib.is_string, run.actor.login, "actor.login"),
            html_url: lib.validate(lib.is_string, run.actor.html_url, "actor.html_url"),
          },
          conclusion: run.conclusion,
          //commit_id: "", @TODO: How to link to tag/pr/branch/commit correctly

          jobs: [],
          ui_state: {},
        };
        data.push(a);
      }
      return undefined;
    } catch (e) {
      console.error(run);
      return e;
    }
  },

  /**
   * @param gh_pat     {string}
   * @param owner_repo {string}
   * @param cache      {Map<number,CacheLine>}
   * @param data       {CacheLine[]}
   */
  async refresh_run(gh_pat, owner_repo, cache, data)  {
    console.log(`Fetching for '${owner_repo}'`);
    const filepath = `tmp/runs_${owner_repo.replace("/", "_")}.json`;
    const resp = (!lib.IS_OFFLINE
      ? await fetch(`https://api.github.com/repos/${owner_repo}/actions/runs`, {
        headers: gh_pat === "" ? {} : { "Authorization": `Bearer ${gh_pat}` },
      })
      : await fetch(`http://${lib.DEBUG_HOST}/${filepath}`)
    );

    const body = await resp.arrayBuffer();
    const run = JSON.parse(new TextDecoder("utf-8").decode(body));
    if (resp.status === 403) {
      return new Error(`403: ${run.message}\nYou probabaly want to use a PAT\n`);
    } else if (resp.status !== 200) {
      return new Error(`Failed to fetch '${owner_repo}' info`);
    }
    if (!lib.IS_OFFLINE) lib.std.writeFileSync(filepath, new Uint8Array(body));

    // Parse
    if (!Array.isArray(run.workflow_runs)) {
      return new Error(`Could not parse runs for ${owner_repo}`);
    }
    const err = lib.parse_runs(owner_repo, run.workflow_runs, data);
    if (err) return err;

    // Propogate old step/ui info
    for (let i = 0; i < data.length; i += 1) {
      const post = data[i];
      const curr = cache.get(post.run_id);
      if (!curr) continue;

      if (curr.jobs.length !== 0 && post.jobs.length === 0) {
        post.jobs = curr.jobs;
      }
      post.ui_state = curr.ui_state;
    }
  },

  /**
   * @param gh_pat    {string}
   * @param owner_repo {string}
   * @param run        {CacheLine}
   */
  async refresh_jobs(gh_pat, owner_repo, run) {
    console.log(`Fetching jobs for ${run.owner_repo} ${run.run_id}`);
    const filepath = `tmp/jobs_${run.run_id}.json`;

    const resp = (!lib.IS_OFFLINE
      ? await fetch(`https://api.github.com/repos/${owner_repo}/actions/runs/${run.run_id}/jobs`, {
        headers: gh_pat === "" ? {} : { "Authorization": `Bearer ${gh_pat}` },
      })
      : await fetch(`http://${lib.DEBUG_HOST}/${filepath}`)
    );
    const body = await resp.arrayBuffer();
    const as_string = new TextDecoder("utf-8").decode(body);
    const as_json = JSON.parse(as_string);

    if (resp.status === 403) {
      return new Error(`403: ${as_json.message}\nYou probabaly want to use a PAT\n`);
    } else if (resp.status !== 200) {
      return new Error(`Failed to fetch '${run.owner_repo}/actions/runs/${run.run_id}'`);
    }
    // Overwrite if request successful
    if (!lib.IS_OFFLINE) lib.std.writeFileSync(filepath, new Uint8Array(body));


    if (as_json.jobs.length === 0) return; // Workflow syntax error
    if (as_json.jobs[0].run_id !== run.run_id) return; // `run` changed during await

    if (!Array.isArray(as_json.jobs)) {
      console.error(as_string, "\n");
      return new Error(`Could not parse job_${run.run_id}.`);
    }
    run.jobs = as_json.jobs;
  },

  /**
   * @param timestamp {number}
   */
  format_timestamp(timestamp) {
    const now = new Date();
    const diff = now.getTime() - timestamp;

    const hour_ms = 60 * 60 * 1000;

    if (diff < hour_ms) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
    } else if (diff < (hour_ms * 48)) {
        const hours = Math.floor(diff / hour_ms);
        return `${hours} hour${hours === 0 ? "" : "s"} ago`;
    } else {
        const target = new Date(timestamp);
        return target.toISOString().slice(0, 16).replace('T', ' ');
    }
  },

  /**
   * @param duration {number}
   */
  format_duration(duration) {
    const dur_s = Math.floor(duration / 1000); 
    if (dur_s < 60) {
        return `${dur_s} s`;
    } else if (dur_s <  60 * 60) { // Less than 1 hour
        const minu = Math.floor(dur_s / 60);
        const seco = dur_s % 60;
        return `${minu} min ${seco} s`;
    } else {
        const hour = Math.floor(dur_s / 3600);
        const minu = Math.floor((dur_s % 3600) / 60);
        return `${hour}h ${minu}m`;
    }
  },

  /**
   * @param repo_list_str {string}
   * @param into          {string[]}
   */
  split_repos_into(repo_list_str, into) {
    let cursor = 0;
    for (let i = 0; i < repo_list_str.length; i++) {
      if (repo_list_str[i] === '\n') {
        if(cursor !== i) {
          into.push(repo_list_str.slice(cursor, i).trim());
        }
        cursor = i + 1;
      }
    }
    if (cursor !== repo_list_str.length) {
      into.push(repo_list_str.slice(cursor));
    }
  },

  /**
   * @param conclusion {string | null}
   */
  conclusion_2_emoji(conclusion) {
    if (!conclusion) { // (null when pending)
      return "🔁";
    } else if (conclusion == "success") {
      return "✅";
    } else if (conclusion == "failure") {
      return "❌";
    } else if (conclusion == "action_required") {
      return "⚠️";
    } else if (conclusion == "cancelled") {
      return "🚫";
    } else if (conclusion == "skipped") {
      return "⚪";
    } else {
      console.error(`Unknown action conclusion: ${conclusion}`);
      return "❓";
    }
  },
};
