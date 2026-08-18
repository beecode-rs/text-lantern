import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'

import { settingsDalSingleton } from '#src/main/dal/settings-dal'
import { constant } from '#src/main/util/constants'
import { logger } from '#src/main/util/logger'
import { pathUtil } from '#src/main/util/path-util'
import type { HistoryEntry } from '#src/shared/types'

export class HistoryDal {
  readonly events: EventEmitter

  protected _cache: HistoryEntry[] = []

  constructor() {
    this.events = new EventEmitter()
    this.events.setMaxListeners(50)
  }

  init(): HistoryEntry[] {
    try {
      const raw = fs.readFileSync(this._historyFilePath(), 'utf8')
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this._cache = parsed as HistoryEntry[]
      }
    } catch {
      this._cache = []
    }
    this._cache = this._cache.slice(0, this._resolveHistoryLimit())
    this._persistHistoryToDisk()

    return this._cache
  }

  get(): HistoryEntry[] {
    return this._cache
  }

  add(params: { text: string; voice: string }): HistoryEntry[] {
    const entry: HistoryEntry = {
      createdAt: Date.now(),
      id: randomUUID(),
      text: params.text,
      voice: params.voice,
    }
    this._cache = [entry, ...this._cache].slice(0, this._resolveHistoryLimit())
    this._persistHistoryToDisk()
    this._emitChanged()

    return this._cache
  }

  clear(): HistoryEntry[] {
    this._cache = []
    this._persistHistoryToDisk()
    this._emitChanged()

    return this._cache
  }

  prune(): HistoryEntry[] {
    const limited = this._cache.slice(0, this._resolveHistoryLimit())
    if (limited.length === this._cache.length) {
      return this._cache
    }
    this._cache = limited
    this._persistHistoryToDisk()
    this._emitChanged()

    return this._cache
  }

  protected _historyFilePath(): string {
    return pathUtil.userDataFile('history.json')
  }

  protected _resolveHistoryLimit(): number {
    const limit = settingsDalSingleton().get().historyLimit
    if (limit > 0) {
      return limit
    }

    return constant().history.defaultEntryLimit
  }

  protected _persistHistoryToDisk(): void {
    try {
      fs.writeFileSync(this._historyFilePath(), JSON.stringify(this._cache, null, 2), 'utf8')
    } catch (err) {
      logger().error('Failed to save history:', err)
    }
  }

  protected _emitChanged(): void {
    this.events.emit('changed', this._cache)
  }
}

export const historyDalSingleton = singletonPattern(() => new HistoryDal())
