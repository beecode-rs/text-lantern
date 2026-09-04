import { TtsProvider } from '#src/shared/types'
import { voiceIdParser } from '#src/shared/voice/voice-id'

const MODEL_NAME_PREFIX = 'model-'

export enum CosyvoiceArtifactName {
  ENGINE = 'engine',
  FRONTEND = 'frontend',
}

export enum CosyvoiceArtifactKind {
  ENGINE = 'ENGINE',
  FRONTEND = 'FRONTEND',
  MODEL = 'MODEL',
}

export type CosyvoiceArtifactRef =
  | { kind: CosyvoiceArtifactKind.ENGINE }
  | { kind: CosyvoiceArtifactKind.FRONTEND }
  | { fileName: string; kind: CosyvoiceArtifactKind.MODEL }

const KIND_BY_NAME: Record<string, CosyvoiceArtifactKind.ENGINE | CosyvoiceArtifactKind.FRONTEND | undefined> = {
  [CosyvoiceArtifactName.ENGINE]: CosyvoiceArtifactKind.ENGINE,
  [CosyvoiceArtifactName.FRONTEND]: CosyvoiceArtifactKind.FRONTEND,
}

export const cosyvoiceArtifactUtil = {
  engineDownloadId(): string {
    return voiceIdParser.build({ name: CosyvoiceArtifactName.ENGINE, provider: TtsProvider.COSYVOICE })
  },
  frontendDownloadId(): string {
    return voiceIdParser.build({ name: CosyvoiceArtifactName.FRONTEND, provider: TtsProvider.COSYVOICE })
  },
  modelDownloadId(params: { fileName: string }): string {
    return voiceIdParser.build({
      name: `${MODEL_NAME_PREFIX}${params.fileName}`,
      provider: TtsProvider.COSYVOICE,
    })
  },
  parse(params: { id: string }): CosyvoiceArtifactRef | null {
    const { name, provider } = voiceIdParser.parse({ id: params.id })
    if (provider !== TtsProvider.COSYVOICE) {
      return null
    }
    const namedKind = KIND_BY_NAME[name]
    if (namedKind !== undefined) {
      return { kind: namedKind }
    }
    if (!name.startsWith(MODEL_NAME_PREFIX)) {
      return null
    }

    return { fileName: name.slice(MODEL_NAME_PREFIX.length), kind: CosyvoiceArtifactKind.MODEL }
  },
}
