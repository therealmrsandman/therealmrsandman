export type Reading = {
  tokens: number
  window: number
  percent: number
  usd: number | null
  limit: { kind: string; percentUsed: number } | null
  turnDelta: number
}

declare module 'claude-code' {
  interface PluginState {
    'token-meter': { reading: Reading | null; warned: number; isHidden: boolean }
  }
}
