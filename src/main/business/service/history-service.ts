import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import { settingsService } from '@src/main/business/service/settings-service'
import { pathsService } from '@src/main/util/paths-service'
import type { HistoryEntry } from '@src/shared/types'

const DEFAULT_HISTORY_LIMIT = 5

const events = new EventEmitter()
events.setMaxListeners(50)

let cache: HistoryEntry[] = []

function _historyFilePath(): string {
  return pathsService.userDataFile('history.json')
}

/**
 * Resolves the active retention limit from the current settings, falling back to
 * the built-in default when the stored value is missing or non-positive. Read
 * live so changes under Settings → History take effect immediately.
 */
function _limit(): number {
  const limit = settingsService.get().historyLimit
  if (limit > 0) {
    return limit
  }
  return DEFAULT_HISTORY_LIMIT
}

function _persistHistoryToDisk(): void {
  try {
    fs.writeFileSync(_historyFilePath(), JSON.stringify(cache, null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to save history:', err)
  }
}

function _emitChanged(): void {
  events.emit('changed', cache)
}

export const historyService = {
  events,

  /**
   * Loads `history.json` into memory, tolerating a missing or corrupt file by
   * starting empty, then trims to the current limit and rewrites the file so a
   * stale over-long list on disk never exceeds the configured retention.
   */
  init(): HistoryEntry[] {
    try {
      const raw = fs.readFileSync(_historyFilePath(), 'utf8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        cache = parsed as HistoryEntry[]
      }
    } catch {
      cache = []
    }
    cache = cache.slice(0, _limit())
    _persistHistoryToDisk()
    return cache
  },

  get(): HistoryEntry[] {
    return cache
  },

  /**
   * Prepends a new reading and trims the list to the configured limit, then
   * persists and notifies listeners. Recorded at dispatch time so the reading is
   * available for replay even when synthesis later fails.
   */
  add(params: { text: string; voice: string }): HistoryEntry[] {
    const entry: HistoryEntry = {
      id: randomUUID(),
      text: params.text,
      voice: params.voice,
      createdAt: Date.now()
    }
    cache = [entry, ...cache].slice(0, _limit())
    _persistHistoryToDisk()
    _emitChanged()
    return cache
  },

  clear(): HistoryEntry[] {
    cache = []
    _persistHistoryToDisk()
    _emitChanged()
    return cache
  },

  /**
   * Re-applies the current limit, dropping any entries that no longer fit. Called
   * when the retention setting shrinks; a no-op (no persist, no emit) when the
   * list already fits so listeners are not notified needlessly.
   */
  prune(): HistoryEntry[] {
    const limited = cache.slice(0, _limit())
    if (limited.length === cache.length) {
      return cache
    }
    cache = limited
    _persistHistoryToDisk()
    _emitChanged()
    return cache
  }
}
