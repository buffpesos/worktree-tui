import { useState } from "react"
import { useKeyboard, useRenderer } from "@opentui/react"
import { Header } from "./components/Header.tsx"
import { StatusBar } from "./components/StatusBar.tsx"
import { WorktreeList, WORKTREE_SHORTCUTS } from "./components/WorktreeList.tsx"
import { AddWorktree, ADD_SHORTCUTS } from "./components/AddWorktree.tsx"
import { HelpView, HELP_SHORTCUTS } from "./components/HelpView.tsx"
import { basename } from "path"
import { homedir } from "os"

const TABS = ["Worktrees", "Add", "Help"]
const TAB_SHORTCUTS = [
  WORKTREE_SHORTCUTS,
  ADD_SHORTCUTS,
  HELP_SHORTCUTS,
]

interface AppProps {
  umbrellaRoot: string
}

export function App({ umbrellaRoot }: AppProps) {
  const renderer = useRenderer()
  const [activeTab, setActiveTab] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [inputFocused, setInputFocused] = useState(false)

  useKeyboard((key) => {
    if (key.name === "tab" && !inputFocused) {
      setActiveTab((t) => key.shift ? (t - 1 + TABS.length) % TABS.length : (t + 1) % TABS.length)
      return
    }
    if (inputFocused) return

    if (key.ctrl && key.name === "c") {
      renderer.destroy()
    }
  })

  function openWorktree(worktreePath: string) {
    const escaped = worktreePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
    Bun.spawn(["osascript",
      "-e", `tell application "iTerm2"`,
      "-e", `  create window with default profile`,
      "-e", `  tell current session of current window`,
      "-e", `    write text "cd '${escaped}' && claude"`,
      "-e", `  end tell`,
      "-e", `end tell`,
    ])
    setStatusMessage(`Opened iTerm2 in ${worktreePath.replace(homedir(), "~")}`)
  }

  const repoLabel = basename(umbrellaRoot)

  return (
    <box flexDirection="column" width="100%" height="100%">
      <Header tabs={TABS} activeTab={activeTab} repoLabel={repoLabel} />

      <box
        flexGrow={1}
        border
        borderStyle="rounded"
        borderColor="#414868"
        marginLeft={1}
        marginRight={1}
      >
        {activeTab === 0 && (
          <WorktreeList focused onStatus={setStatusMessage} onOpen={openWorktree} />
        )}
        {activeTab === 1 && (
          <AddWorktree
            focused
            onStatus={setStatusMessage}
            onInputFocus={setInputFocused}
            onCreated={() => setActiveTab(0)}
            umbrellaRoot={umbrellaRoot}
          />
        )}
        {activeTab === 2 && <HelpView />}
      </box>

      <StatusBar
        shortcuts={[
          { key: "Tab", action: "switch tabs" },
          ...TAB_SHORTCUTS[activeTab],
          { key: "Ctrl+C", action: "quit" },
        ]}
        message={statusMessage}
      />
    </box>
  )
}
