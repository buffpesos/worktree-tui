import { useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { createUmbrella, listUntrackedFiles, copyToShared, symlinkFromShared } from "../utils/git.ts"
import { FileSelector } from "./FileSelector.tsx"
import { App } from "../App.tsx"
import { basename, dirname, resolve, join } from "path"

type SetupMode =
  | { kind: "from-repo"; remote: string; repoRoot: string }
  | { kind: "fresh"; cwd: string }

interface SetupScreenProps {
  mode: SetupMode
}

type Phase = "prompt" | "confirm" | "running" | "untracked" | "error" | "done"

function projectNameFromUrl(url: string): string {
  return basename(url).replace(/\.git$/, "") || "project"
}

export function SetupScreen({ mode }: SetupScreenProps) {
  const renderer = useRenderer()

  const initialRemote = mode.kind === "from-repo" ? mode.remote : ""
  const initialPhase: Phase = mode.kind === "from-repo" ? "confirm" : "prompt"

  const [remote, setRemote] = useState(initialRemote)
  const [phase, setPhase] = useState<Phase>(initialPhase)
  const [errorMsg, setErrorMsg] = useState("")
  const [untrackedFiles, setUntrackedFiles] = useState<string[]>([])

  const projectName =
    mode.kind === "from-repo"
      ? basename(mode.repoRoot)
      : projectNameFromUrl(remote)

  const parentDir =
    mode.kind === "from-repo" ? dirname(mode.repoRoot) : mode.cwd

  const umbrellaDir = resolve(parentDir, `${projectName}-worktrees`)
  const mainWorktreeDir = join(umbrellaDir, "main")

  useKeyboard((key) => {
    if (phase === "prompt") {
      if (key.name === "return" && remote.trim()) {
        setPhase("confirm")
      }
      if (key.name === "escape") {
        renderer.destroy()
      }
      return
    }

    if (phase === "confirm") {
      if (key.name === "y") {
        runSetup()
      } else if (key.name === "n" || key.name === "escape") {
        if (mode.kind === "fresh") {
          setPhase("prompt")
        } else {
          renderer.destroy()
        }
      }
    }

    // untracked phase is handled by FileSelector

    if (phase === "error" && key.name === "escape") {
      renderer.destroy()
    }
  })

  async function runSetup() {
    setPhase("running")
    const result = await createUmbrella(remote, umbrellaDir)
    if (!result.success) {
      setErrorMsg(result.message)
      setPhase("error")
      return
    }

    process.chdir(umbrellaDir)

    // Scan the ORIGINAL repo for untracked files to carry over
    if (mode.kind === "from-repo") {
      const files = await listUntrackedFiles(mode.repoRoot)
      if (files.length > 0) {
        setUntrackedFiles(files)
        setPhase("untracked")
        return
      }
    }

    setPhase("done")
  }

  async function handleFileSelection(selectedFiles: string[]) {
    const sourceRoot = mode.kind === "from-repo" ? mode.repoRoot : ""
    await copyToShared(sourceRoot, selectedFiles, umbrellaDir)
    await symlinkFromShared(umbrellaDir, mainWorktreeDir)
    setPhase("done")
  }

  if (phase === "done") {
    return <App umbrellaRoot={umbrellaDir} />
  }

  if (phase === "running") {
    return (
      <box
        flexDirection="column"
        padding={2}
        gap={1}
        width="100%"
        height="100%"
      >
        <text>
          <span fg="#7aa2f7">
            <strong>Setting up worktree umbrella...</strong>
          </span>
        </text>
        <text fg="#565f89">Cloning and configuring bare repo</text>
      </box>
    )
  }

  if (phase === "error") {
    return (
      <box
        flexDirection="column"
        padding={2}
        gap={1}
        width="100%"
        height="100%"
      >
        <text>
          <span fg="#f7768e">
            <strong>Setup failed</strong>
          </span>
        </text>
        <text fg="#f7768e">{errorMsg}</text>
        <text fg="#565f89">Press Escape to exit</text>
      </box>
    )
  }

  if (phase === "untracked") {
    return (
      <box
        flexDirection="column"
        padding={2}
        gap={1}
        width="100%"
        height="100%"
      >
        <text>
          <span fg="#9ece6a">
            <strong>{"Umbrella created!"}</strong>
          </span>
        </text>
        <text fg="#a9b1d6">
          {`Found ${untrackedFiles.length} untracked file${untrackedFiles.length !== 1 ? "s" : ""} in your original repo.`}
        </text>
        <text fg="#565f89">{"Select which to copy into .shared/ and symlink into main/:"}</text>
        <FileSelector
          files={untrackedFiles}
          focused
          onConfirm={handleFileSelection}
          onSkip={() => setPhase("done")}
        />
        <text fg="#414868">{`Selected files are copied to ${join(umbrellaDir, ".shared")}/`}</text>
        <text fg="#414868">{"and symlinked into each worktree. Future worktrees will"}</text>
        <text fg="#414868">{"also get these symlinks automatically."}</text>
      </box>
    )
  }

  if (phase === "prompt") {
    return (
      <box
        flexDirection="column"
        padding={2}
        gap={1}
        width="100%"
        height="100%"
      >
        <text>
          <span fg="#7aa2f7">
            <strong>New worktree umbrella</strong>
          </span>
        </text>
        <text fg="#a9b1d6">{"Not inside a git repository. Enter a remote URL to clone:"}</text>
        <text>{""}</text>
        <box flexDirection="row" gap={1} alignItems="center">
          <text fg="#565f89">URL:</text>
          <input
            value={remote}
            onChange={setRemote}
            placeholder="git@github.com:user/repo.git"
            focused
            width={50}
            backgroundColor="#1a1b26"
            focusedBackgroundColor="#24283b"
            textColor="#c0caf5"
          />
        </box>
        <text>{""}</text>
        <text fg="#565f89">Enter: continue  Escape: exit</text>
      </box>
    )
  }

  // confirm phase
  return (
    <scrollbox width="100%" height="100%">
      <box flexDirection="column" padding={2} gap={1}>
        <text>
          <span fg="#7aa2f7">
            <strong>{`Setting up worktree umbrella for "${projectName}"`}</strong>
          </span>
        </text>
        <text>{""}</text>
        <text fg="#a9b1d6">{"The following will be created:"}</text>
        <box flexDirection="column" paddingLeft={2}>
          <box flexDirection="row">
            <text width={10} fg="#9ece6a">{".bare/"}</text>
            <text fg="#565f89">{"bare clone"}</text>
          </box>
          <box flexDirection="row">
            <text width={10} fg="#9ece6a">{".git"}</text>
            <text fg="#565f89">{"gitdir pointer"}</text>
          </box>
          <box flexDirection="row">
            <text width={10} fg="#9ece6a">{"main/"}</text>
            <text fg="#565f89">{"initial worktree"}</text>
          </box>
        </box>
        <text>{""}</text>
        <text fg="#565f89">{`Location: ${umbrellaDir}`}</text>
        <text>{""}</text>
        <text fg="#565f89">{`Source: ${remote}`}</text>
        <text>{""}</text>
        {mode.kind === "from-repo" && (
          <text fg="#565f89">{"Your existing repo will not be modified."}</text>
        )}
        <text fg="#565f89">{"A bare clone stores git objects without a working directory."}</text>
        <text fg="#565f89">{"Each branch gets its own worktree folder - you can work on"}</text>
        <text fg="#565f89">{"multiple branches at once without stashing or switching."}</text>
        <text>{""}</text>
        <text fg="#e0af68">{"Proceed? (y/n)"}</text>
      </box>
    </scrollbox>
  )
}
