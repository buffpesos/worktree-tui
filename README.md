# worktree

A terminal UI for managing git worktrees using the umbrella/bare-repo pattern. Built with [Bun](https://bun.sh) and [OpenTUI](https://github.com/anthropics/opentui).

Work on multiple branches at the same time — no more `git stash`, no more switching branches. Each branch lives in its own directory.

## How it works

`worktree` sets up an **umbrella directory** with a bare clone at its core. Instead of one working directory that you switch between branches, each branch gets its own folder:

```
my-app-worktrees/
  .bare/            # bare clone (shared git objects)
  .git              # gitdir pointer → .bare
  .shared/          # untracked files shared across worktrees
  main/             # worktree for main branch
  feature-cool/     # worktree for feature/cool
  fix-bug/          # worktree for fix/bug
```

All worktrees share the same git history, remotes, and config through `.bare/`. You can `cd` into any worktree and use git normally — commit, push, pull — without affecting other worktrees.

### Why bare clone?

A normal `git clone` checks out a branch into a working directory and stores objects in `.git/`. This means git worktrees are "secondary" to the main checkout. With a bare clone, there's **no** main checkout — every branch is an equal worktree. This is cleaner and avoids the problem of accidentally working in the primary checkout.

## Features

- **Automatic setup** — Run `worktree` in any git repo and it creates the umbrella structure for you. Confirmation screen explains exactly what will happen before anything is created.
- **Smart detection** — Automatically detects if you're already inside an umbrella, a regular git repo, or not in a repo at all, and adapts accordingly.
- **Shared files (`.shared/`)** — Untracked files like `.env` can be copied into a central `.shared/` directory and symlinked into every worktree. Change one, it updates everywhere.
- **Automatic untracked file discovery** — When creating a worktree, existing worktrees are scanned for untracked files and `.env` files. Select which ones to share via a tree-based file picker. Build artifacts (`.next/`, `node_modules/`, `dist/`, etc.) and hidden files are automatically excluded — only `.env*` files are surfaced from gitignored files.
- **Tree-based file picker** — When selecting files to share, the picker groups files by directory. Select an entire directory at once or pick individual files.
- **Worktree management** — List all worktrees, create new ones from existing or new branches, and remove worktrees with confirmation. The internal bare repo is hidden from the list. Branches already checked out in a worktree are automatically excluded from the branch picker.
- **Auto-generated paths** — The worktree path is automatically derived from the branch name (e.g. `feature/cool-thing` becomes `feature-cool-thing`). You can still override it manually.
- **Auto-navigate on create** — After creating a worktree, the UI automatically switches back to the Worktrees tab so you can see it in the list.
- **Educational UI** — Every confirmation screen explains what the operation does and how git worktrees work under the hood. The Help tab includes a full cheatsheet.

## Install

```bash
bun install
bun link
```

This registers the `worktree` command globally.

## Usage

Run `worktree` from anywhere:

| Context | What happens |
|---|---|
| Inside an umbrella | Opens the TUI directly |
| Inside a regular git repo | Shows a confirmation screen, creates the umbrella, then opens the TUI |
| Not a git repo | Prompts for a remote URL to clone fresh |

### First run from a regular repo

When you run `worktree` inside a regular git repo (e.g. `~/projects/my-app`), it will:

1. Detect the remote URL and project name
2. Show you exactly what will be created:
   ```
   ~/projects/my-app-worktrees/.bare    (bare clone)
   ~/projects/my-app-worktrees/.git     (gitdir pointer)
   ~/projects/my-app-worktrees/main/    (initial worktree)
   ```
3. Ask you to confirm (y/n)
4. After setup, scan your original repo for untracked files and `.env` files
5. Let you pick which files to copy into `.shared/` and symlink into `main/`
6. Open the TUI

Your original repo is **not** modified. The umbrella is created as a sibling directory.

### First run outside a git repo

If you run `worktree` outside a git repo, it prompts for a remote URL to clone:

```
URL: git@github.com:user/repo.git
```

It then creates the umbrella in the current directory.

### Subsequent runs

Once the umbrella exists, running `worktree` from anywhere inside it (including from inside a worktree like `main/`) opens the TUI directly.

## Tabs

| Key | Tab | Description |
|---|---|---|
| `Tab` | **Worktrees** | List, inspect, and remove worktrees |
| `Tab` | **Add** | Create a new worktree from an existing or new branch |
| `Tab` | **Help** | Git worktree cheatsheet, workflow tips, and setup patterns |

### Worktrees tab

- Browse all worktrees with their branch name, path, and commit hash (bare repo is hidden)
- Select a worktree and press Enter to remove it (with confirmation)
- `r` to refresh the list
- `p` to prune stale worktree references

Removal confirmation shows what will happen: the directory is deleted and the worktree is unlinked, but the **branch is not deleted** — it stays in the bare repo and can be checked out again.

### Add tab

Create a new worktree in two modes:

- **Existing branch** — Pick from a list of local branches (branches already checked out in a worktree are excluded). If all branches have worktrees, this option is hidden.
- **New branch** — Type a branch name to create (e.g. `feature/cool`)

The path is auto-generated from the branch name — slashes are replaced with dashes (e.g. `feature/cool` → `feature-cool`). You can manually edit the path if you prefer something different. Relative paths are resolved from the umbrella root, so `cool-feature` creates `<umbrella>/cool-feature/`.

After creation, the UI switches to the Worktrees tab. If shared files are available:
- If `.shared/` has files, the file picker lets you choose which ones to symlink into the new worktree
- If `.shared/` is empty, existing worktrees are scanned for untracked files — select which ones to copy into `.shared/` and symlink

### Help tab

A scrollable reference with:
- Common git worktree commands
- Day-to-day workflow (create, work, push, merge, clean up)
- Tips for using worktrees with Claude
- Setup patterns (standard, umbrella, bare repo)
- Notes on managing `.env` files

## The `.shared/` directory

Worktrees share git history but **not** untracked files. This is a problem for things like `.env` files.

`worktree` solves this with the `.shared/` directory:

1. During initial setup, you pick which untracked files from your original repo to share
2. Selected files are copied into `<umbrella>/.shared/`, preserving directory structure
3. Symlinks are created from each worktree back to `.shared/`
4. When you create a new worktree, the file picker lets you choose which `.shared/` files to symlink

Since they're symlinks, editing `.env` in one worktree updates it everywhere.

### What files are shown?

The file picker is intentionally selective:
- **Untracked files** (not in `.gitignore`) — shown, except hidden files (dotfiles)
- **`.env*` files** — always shown, even if gitignored (`.env`, `.env.local`, `.env.production`, etc.)
- **Build artifacts** — automatically excluded (`.next/`, `node_modules/`, `dist/`, `.turbo/`, `.nuxt/`, `.cache/`, `__pycache__/`, virtual environments)
- **`.DS_Store`** — excluded

### File picker controls

The file picker groups files by directory and supports bulk selection:

```
> [x] config/              (3 files)
    [x] database.yml
    [x] secrets.yml
    [x] local.yml
  [x] .env
  [x] .env.local
```

- `Up`/`Down` — Move cursor
- `Space` — Toggle file or entire directory
- `a` — Select all
- `d` — Deselect all
- `Enter` — Confirm selection
- `Escape` — Skip

Toggling a directory selects or deselects all files within it. A directory shows `[x]` when all files are selected, `[-]` when some are, and `[ ]` when none are.

## Key bindings

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Switch tabs |
| `Ctrl+C` | Quit |
| `Ctrl+S` | Create worktree (Add tab) |
| `Up`/`Down` | Navigate fields / lists |
| `Enter` | Select / toggle |
| `Escape` | Go back / cancel |

## Development

```bash
bun run dev    # watch mode
bun run start  # single run
```

## Under the hood

The umbrella setup runs these commands:

```bash
# 1. Clone as bare repo
git clone --bare <remote> my-app-worktrees/.bare

# 2. Create gitdir pointer so git commands work from the umbrella root
echo "gitdir: ./.bare" > my-app-worktrees/.git

# 3. Fix fetch config (bare clones don't fetch all branches by default)
git -C my-app-worktrees/.bare config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
git -C my-app-worktrees/.bare fetch origin

# 4. Create the first worktree
git worktree add my-app-worktrees/main main
```

This gives you a single `.bare` directory that holds all git objects, with each branch checked out as a separate directory. All worktrees share history, remotes, and config.

## Tech stack

- [Bun](https://bun.sh) — Runtime and package manager
- [OpenTUI](https://github.com/anthropics/opentui) — Terminal UI framework
- [React](https://react.dev) — UI via OpenTUI's React reconciler
