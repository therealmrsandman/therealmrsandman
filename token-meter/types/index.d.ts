export type ToolCost = { name: string; tokens: number }

export type Budget = { kind: 'tokens' | 'usd'; limit: number }

export type Turn = { delta: number; tool?: string }

export type Stats = { peakPercent: number; peakTokens: number; compactions: number; turns: Turn[] }

export type Reading = {
  tokens: number
  window: number
  percent: number
  usd: number | null
  limit: { kind: string; percentUsed: number } | null
  turnDelta: number
  // Set by /clear and compaction: the next reading is a fresh base, not a turn's growth.
  rebase?: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'token-meter': {
      reading: Reading | null; warned: number; isHidden: boolean; tools: ToolCost[]
      budget: Budget | null
      budgetWarned: number
      spent: number
      stats: Stats
      autoCompacted: boolean
    }
  }
}
