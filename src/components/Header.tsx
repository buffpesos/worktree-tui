interface HeaderProps {
  tabs: string[]
  activeTab: number
  repoLabel: string
}

export function Header({ tabs, activeTab, repoLabel }: HeaderProps) {
  return (
    <box flexDirection="column">
      <box flexDirection="row" paddingLeft={1} paddingTop={1} justifyContent="space-between" paddingRight={2}>
        <ascii-font text="worktree" font="tiny" color="#7aa2f7" />
        <box alignSelf="flex-end" paddingBottom={1}>
          <text fg="#565f89">{repoLabel}</text>
        </box>
      </box>
      <box flexDirection="row" paddingLeft={1} paddingRight={1} gap={1}>
        {tabs.map((name, i) => (
          <box
            key={name}
            border
            borderStyle="rounded"
            borderColor={i === activeTab ? "#7aa2f7" : "#414868"}
            backgroundColor={i === activeTab ? "#24283b" : undefined}
            paddingLeft={1}
            paddingRight={1}
          >
            <text fg={i === activeTab ? "#7aa2f7" : "#565f89"}>
              {name}
            </text>
          </box>
        ))}
      </box>
    </box>
  )
}
