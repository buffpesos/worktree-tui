export interface Shortcut {
  key: string
  action: string
}

interface StatusBarProps {
  shortcuts: Shortcut[]
  message?: string
}

export function StatusBar({ shortcuts, message }: StatusBarProps) {
  return (
    <box flexDirection="column">
      {message ? (
        <box height={1} paddingLeft={1}>
          <text>
            <span fg={message.startsWith("Error") ? "#f7768e" : "#9ece6a"}>
              {message}
            </span>
          </text>
        </box>
      ) : null}
      <box height={1} paddingLeft={1} paddingRight={1} flexDirection="row" gap={2}>
        {shortcuts.map((s, i) => (
          <text key={i}>
            <span fg="#7aa2f7">{s.key}</span>
            <span fg="#a9b1d6">{` ${s.action}`}</span>
          </text>
        ))}
      </box>
    </box>
  )
}
