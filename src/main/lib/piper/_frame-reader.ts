export interface Frame {
  type: number
  payload: Buffer
}

export class FrameReader {
  protected _buffer: Buffer = Buffer.alloc(0)

  protected readonly _onFrame: (frame: Frame) => void

  constructor(onFrame: (frame: Frame) => void) {
    this._onFrame = onFrame
  }

  push(chunk: Buffer): void {
    this._buffer = Buffer.concat([this._buffer, chunk])
    this._drain()
  }

  protected _drain(): void {
    if (this._buffer.length < 4) {
      return
    }
    const length = this._buffer.readUInt32BE(0)
    if (length <= 0 || this._buffer.length < 4 + length) {
      return
    }
    const body = this._buffer.subarray(4, 4 + length)
    this._buffer = this._buffer.subarray(4 + length)
    this._onFrame({ payload: Buffer.from(body.subarray(1)), type: body[0] })
    this._drain()
  }
}
