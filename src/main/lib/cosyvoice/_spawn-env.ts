import path from 'node:path'

import { pathUtil } from '#src/main/util/path-util'

export const cosyvoiceSpawnEnv = {
  _dyldLibraryPath(): string {
    const binDir = pathUtil.cosyvoiceBinDir()
    const inherited = process.env.DYLD_LIBRARY_PATH
    if (!inherited) {
      return binDir
    }

    return [binDir, inherited].join(path.delimiter)
  },

  build(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env }
    env['DYLD_LIBRARY_PATH'] = this._dyldLibraryPath()

    return env
  },
}
