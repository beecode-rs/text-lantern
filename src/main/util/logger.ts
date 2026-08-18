import { PresetPino } from '@beecode/msh-logger/controller/preset/pino'
import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import { constant } from '#src/main/util/constants'

export const logger = singletonPattern(() => {
  return new PresetPino({
    category: constant().projectName,
    logLevel: constant().logger.defaultLogLevel,
    meta: { projectVersion: constant().projectVersion },
  })
})
