import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

export class Platform {
  isMac(): boolean {
    if (typeof navigator === 'undefined') {
      return false
    }

    return /Mac|iPhone|iPad/.test(navigator.platform)
  }
}

export const platformSingleton = singletonPattern(() => new Platform())
