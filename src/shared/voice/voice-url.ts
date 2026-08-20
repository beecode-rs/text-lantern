export interface ParsedVoiceUrl {
  name: string
  jsonUrl: string
  onnxUrl: string
}

export const voiceUrlParser = {
  parse(params: { url: string }): ParsedVoiceUrl | null {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(params.url.trim())
    } catch {
      return null
    }
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return null
    }

    const path = parsedUrl.pathname.replace('/blob/', '/resolve/')
    const match = /^(?<dir>.+)\/(?<name>[^/]+)\.onnx(?:\.json)?$/.exec(path)
    if (!match?.groups || match.groups.name === '' || match.groups.dir === '') {
      return null
    }

    const { dir, name } = match.groups

    return {
      jsonUrl: `${parsedUrl.origin}${dir}/${name}.onnx.json`,
      name,
      onnxUrl: `${parsedUrl.origin}${dir}/${name}.onnx`,
    }
  },
}
