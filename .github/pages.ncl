let lib = import "../_lib.ncl" in

#run: nickel export % --field pipeline --format yaml | tee workflows/pages.yaml

{
  files = {},
  inp = lib.format_inputs {},
  output = {},

  pipeline = {
    name     = "Build pages",
    #run-name = name,

    on = {
      workflow_dispatch = inp.workflow_dispatch,
      push = {
        branches = "main"
      },
    },
    permissions = {
      pages    = "write", # For pages
      id-token = "write", # For pages
    },
    jobs = {
      pages = {
        name    = "Build",
        runs-on = "ubuntu-latest",
        steps   = [
          {
            name = "Install Zine",
            uses = "yueleshia/binaries@main",
            with = {
              key    = "zine-x86_64-linux-musl-0.11.1.tar.xz",
              sha256 = "2afe72a8dbeb19627c269ef980faee933c7ba134b6c8d9291fa758504fbf635a",
            },
          },
          {
            name = "Clone",
            env = {
              repo  = "${{ github.repository }}",
              token = "${{ github.token }}",
            },
            run = m%"
              printf %s\\n "" "" "=== Cloning ${repo} ===" >&2
              git init "repo"
              git -C "repo" remote add origin "https://x-access-token:${token}@github.com/${repo}" || exit "$?"
              git -C "repo" fetch origin "refs/heads/main" --depth 1 || exit "$?"
              git -C "repo" switch --detach FETCH_HEAD || exit "$?"
              git -C "repo" submodule update --init --recursive
            "%,
          },
          {
            name = "Build",
            run  = m%"
              cd repo || exit "$?"
              zine release --output public
            "%,
          },
          { # Upload artifact that is named 1. github-pages 2. is zip of a single tar
            name = "Upload static files as artifact",
            uses = "actions/upload-pages-artifact@v3",
            with = {
              path = "${{ github.workspace }}/repo/public"
            },
          },
          {

            name = "Deploy to GitHub Pages",
            uses = "actions/deploy-pages@v4",
          },
        ],
      }
    },
  },
}
