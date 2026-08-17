import { mshEnv, mshEnvResolver } from '@beecode/msh-env'
import { setEnvLogger } from '@beecode/msh-env/util/logger'
import { LogLevel } from '@beecode/msh-logger'
import { PresetConsoleSimpleString } from '@beecode/msh-logger/controller/preset/console-simple-string'
import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import dotenv from 'dotenv'

setEnvLogger(new PresetConsoleSimpleString({ logLevel: LogLevel.INFO }))

const env = mshEnv()
dotenv.config({ path: './.msh' })
dotenv.config({ path: './.msh-user' })

export const config = singletonPattern(() => {
  return mshEnvResolver({
    appRoot: env('APP_ROOT').string.default(process.cwd()),
    logLevel: env('LOG_LEVEL').string.default('info'),
    nodeEnv: env('NODE_ENV').string.default('development'),
  })
})
