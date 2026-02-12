#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./App.tsx"
import { SetupScreen } from "./components/SetupScreen.tsx"
import { getUmbrellaRoot, getRepoInfo } from "./utils/git.ts"

// 1. Already inside an umbrella? → open TUI
const umbrellaRoot = await getUmbrellaRoot()

if (umbrellaRoot) {
  process.chdir(umbrellaRoot)
  const renderer = await createCliRenderer({ exitOnCtrlC: true })
  createRoot(renderer).render(<App umbrellaRoot={umbrellaRoot} />)
} else {
  // 2. Inside a regular git repo? → show setup confirmation
  const repoInfo = await getRepoInfo()

  if (repoInfo) {
    if (!repoInfo.remote) {
      console.error(
        "No remote found. An origin remote is required to set up a worktree umbrella."
      )
      process.exit(1)
    }

    const renderer = await createCliRenderer({ exitOnCtrlC: true })
    createRoot(renderer).render(
      <SetupScreen
        mode={{ kind: "from-repo", remote: repoInfo.remote, repoRoot: repoInfo.root }}
      />
    )
  } else {
    // 3. Not a git repo → prompt for remote URL to clone fresh
    const renderer = await createCliRenderer({ exitOnCtrlC: true })
    createRoot(renderer).render(
      <SetupScreen mode={{ kind: "fresh", cwd: process.cwd() }} />
    )
  }
}
