#!/bin/sh

print_do() {
  printf '%s ' "$@" >&2
  printf \\n >&2
  "$@"
}

print_do tmux split-window -h zine
print_do tmux split-window -h 'deno --allow-net --allow-read server.ts 8000'
