import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import packageJson from '#packageJson' with { type: 'json' }

export const APP_NAME = 'Text Lantern'

export const constant = singletonPattern(() =>
    Object.freeze({
        projectName: packageJson.name,
        projectVersion: packageJson.version,
    })
)
