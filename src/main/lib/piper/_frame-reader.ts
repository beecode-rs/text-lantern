export interface Frame {
  type: number
  payload: Buffer
}

export class FrameReader {
  private _buffer: Buffer = Buffer.alloc(0)

  private readonly _onFrame: (frame: Frame) => void

  public constructor(onFrame: (frame: Frame) => void) {
    this._onFrame = onFrame
  }

  public push(chunk: Buffer): void {
    this._buffer = Buffer.concat([this._buffer, chunk])
    this._drain()
  }

  private _drain(): void {
    while (this._buffer.length >= 4) {
      const length = this._buffer.readUInt32BE(0)
      if (length <= 0 || this._buffer.length < 4 + length) {
        return
      }
      const body = this._buffer.subarray(4, 4 + length)
      this._buffer = this._buffer.subarray(4 + length)
      this._onFrame({ type: body[0], payload: Buffer.from(body.subarray(1)) })
    }
  }
}
