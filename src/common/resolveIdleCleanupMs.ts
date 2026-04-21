/**
 * 解析空闲清理窗口（毫秒）
 *
 * 最后一个客户端断开后，空闲多少分钟执行 LevelDB 压缩 + Y.Doc 销毁。
 * 单位：分钟，默认 1 分钟；非法值（空串/NaN/<=0）回退默认。
 * 支持小数（例如 0.5 = 30 秒），但生产环境不建议低于 0.5。
 *
 * 环境变量：DOC_IDLE_CLEANUP_MINUTES
 */
export function resolveIdleCleanupMs(): number {
  const raw = process.env.DOC_IDLE_CLEANUP_MINUTES
  const parsed = raw != null ? Number(raw) : NaN
  const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  return Math.round(minutes * 60 * 1000)
}

/**
 * 获取可读的空闲清理分钟数（用于启动日志）
 */
export function resolveIdleCleanupMinutesReadable(): string {
  const ms = resolveIdleCleanupMs()
  const minutes = ms / 60000
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(2).replace(/\.?0+$/, '')
}
