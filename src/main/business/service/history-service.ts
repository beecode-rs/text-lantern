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

function _resolveHistoryLimit(): number {
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
    cache = cache.slice(0, _resolveHistoryLimit())
    _persistHistoryToDisk()
    return cache
  },

  get(): HistoryEntry[] {
    return cache
  },

  add(params: { text: string; voice: string }): HistoryEntry[] {
    const entry: HistoryEntry = {
      id: randomUUID(),
      text: params.text,
      voice: params.voice,
      createdAt: Date.now()
    }
    cache = [entry, ...cache].slice(0, _resolveHistoryLimit())
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

  prune(): HistoryEntry[] {
    const limited = cache.slice(0, _resolveHistoryLimit())
    if (limited.length === cache.length) {
      return cache
    }
    cache = limited
    _persistHistoryToDisk()
    _emitChanged()
    return cache
  }
}
