export function HelpView() {
  return (
    <scrollbox flexGrow={1} focused height={20}>
      <box flexDirection="column" padding={1} gap={1}>
        <text>
          <strong>Git Worktrees Cheatsheet</strong>
        </text>

        <box
          flexDirection="column"
          border
          borderStyle="rounded"
          borderColor="#414868"
          padding={1}
        >
          <text>
            <span fg="#7aa2f7">
              <strong>Common Commands</strong>
            </span>
          </text>
          <text>{""}</text>
          <box flexDirection="row">
            <text width={45} fg="#9ece6a">
              git worktree list
            </text>
            <text fg="#a9b1d6">Show all active worktrees</text>
          </box>
          <box flexDirection="row">
            <text width={45} fg="#9ece6a">
              {"git worktree add <path> <branch>"}
            </text>
            <text fg="#a9b1d6">Create from existing branch</text>
          </box>
          <box flexDirection="row">
            <text width={45} fg="#9ece6a">
              {"git worktree add <path> -b <branch>"}
            </text>
            <text fg="#a9b1d6">Create with new branch</text>
          </box>
          <box flexDirection="row">
            <text width={45} fg="#9ece6a">
              {"git worktree remove <path>"}
            </text>
            <text fg="#a9b1d6">Remove a worktree</text>
          </box>
          <box flexDirection="row">
            <text width={45} fg="#9ece6a">
              git worktree prune
            </text>
            <text fg="#a9b1d6">Clean up stale references</text>
          </box>
          <box flexDirection="row">
            <text width={45} fg="#9ece6a">
              {"git branch -d <branch>"}
            </text>
            <text fg="#a9b1d6">Delete branch after removal</text>
          </box>
          <box flexDirection="row">
            <text width={45} fg="#9ece6a">
              git fetch origin
            </text>
            <text fg="#a9b1d6">Fetch latest remote branches</text>
          </box>
        </box>

        <box
          flexDirection="column"
          border
          borderStyle="rounded"
          borderColor="#414868"
          padding={1}
        >
          <text>
            <span fg="#7aa2f7">
              <strong>Day to Day Workflow</strong>
            </span>
          </text>
          <text>{""}</text>
          <text fg="#9ece6a">1. Create worktree for your feature</text>
          <text fg="#565f89">
            {"   git worktree add cool-feature -b feature/cool-feature"}
          </text>
          <text fg="#9ece6a">2. Work in the worktree</text>
          <text fg="#565f89">{"   cd cool-feature && claude"}</text>
          <text fg="#9ece6a">3. Push and open PR</text>
          <text fg="#565f89">
            {"   git push origin feature/cool-feature"}
          </text>
          <text fg="#9ece6a">4. After merge, clean up</text>
          <text fg="#565f89">
            {"   git worktree remove cool-feature"}
          </text>
          <text fg="#565f89">
            {"   git branch -d feature/cool-feature"}
          </text>
        </box>

        <box
          flexDirection="column"
          border
          borderStyle="rounded"
          borderColor="#414868"
          padding={1}
        >
          <text>
            <span fg="#7aa2f7">
              <strong>Tips</strong>
            </span>
          </text>
          <text>{""}</text>
          <text fg="#a9b1d6">
            {"\u2022"} 2-3 concurrent Claude sessions is the sweet spot
          </text>
          <text fg="#a9b1d6">
            {"\u2022"} CLAUDE.md at repo root is shared across all worktrees
          </text>
          <text fg="#a9b1d6">
            {"\u2022"} Name worktrees descriptively
          </text>
          <text fg="#a9b1d6">
            {"\u2022"} Short-lived worktrees: create, merge PR, remove
          </text>
          <text fg="#a9b1d6">
            {"\u2022"} A branch cannot be checked out in multiple worktrees
          </text>
        </box>

        <box
          flexDirection="column"
          border
          borderStyle="rounded"
          borderColor="#414868"
          padding={1}
        >
          <text>
            <span fg="#7aa2f7">
              <strong>Setup Patterns</strong>
            </span>
          </text>
          <text>{""}</text>
          <text>
            <span fg="#e0af68">
              <strong>Standard:</strong>
            </span>
            <span fg="#a9b1d6"> Worktrees as sibling directories</span>
          </text>
          <text>
            <span fg="#e0af68">
              <strong>Umbrella:</strong>
            </span>
            <span fg="#a9b1d6">
              {" "}
              Organized under a parent folder
            </span>
          </text>
          <text>
            <span fg="#e0af68">
              <strong>Bare Repo:</strong>
            </span>
            <span fg="#a9b1d6">
              {" "}
              Every branch is an equal worktree (recommended)
            </span>
          </text>
        </box>

        <box
          flexDirection="column"
          border
          borderStyle="rounded"
          borderColor="#414868"
          padding={1}
        >
          <text>
            <span fg="#7aa2f7">
              <strong>Managing .env Files</strong>
            </span>
          </text>
          <text>{""}</text>
          <text fg="#a9b1d6">
            Worktrees share git history but NOT untracked files.
          </text>
          <text fg="#a9b1d6">
            Use symlinks or copy scripts to share .env files.
          </text>
          <text fg="#565f89">
            {"  ln -s ~/project/shared.env .env"}
          </text>
        </box>
      </box>
    </scrollbox>
  )
}

export const HELP_SHORTCUTS = [
  { key: "\u2191\u2193", action: "scroll" },
]
