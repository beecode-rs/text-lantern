export const objectUtil = {
  deepFreeze<T>(value: T): T {
    const seen = new WeakMap<object, unknown>()

    const freeze = (current: unknown): unknown => {
      if (typeof current !== 'object' || current === null) {
        return current
      }
      const cached = seen.get(current)
      if (cached !== undefined) {
        return cached
      }
      if (Array.isArray(current)) {
        return freezeArray(current)
      }
      return freezeObject(current as Record<string, unknown>)
    }

    const freezeArray = (current: unknown[]): readonly unknown[] => {
      const copy: unknown[] = []
      seen.set(current, copy)
      Object.assign(
        copy,
        current.map((child) => {
          return freeze(child)
        })
      )
      return Object.freeze(copy)
    }

    const freezeObject = (current: Record<string, unknown>): Record<string, unknown> => {
      const copy: Record<string, unknown> = {}
      seen.set(current, copy)
      Object.assign(
        copy,
        Object.fromEntries(
          Object.entries(current).map(([key, child]) => {
            return [key, freeze(child)] as const
          })
        )
      )
      return Object.freeze(copy)
    }

    return freeze(value) as T
  }
}
