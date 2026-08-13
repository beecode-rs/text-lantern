#!/usr/bin/env python3
"""Persistent Piper synthesis sidecar.

Loads a single voice model once at startup, then serves synthesis requests
read as newline-delimited JSON from stdin:

    {"text": "...", "length_scale": 1.0}

Responses are written to stdout as length-prefixed binary frames:

    [4-byte big-endian unsigned length][1-byte type][payload]

The length covers the type byte plus the payload. Frame types:

    0x01 READY  payload = JSON {"sample_rate": int}   once, after model load
    0x02 AUDIO  payload = raw signed 16-bit PCM bytes per synthesis chunk
    0x03 END    payload = JSON {"cancelled": bool}     end of one synthesis
    0x04 ERROR  payload = UTF-8 message                synthesis failed

A running synthesis can be cancelled by sending the process SIGUSR1: the
current synthesis stops at the next sentence boundary and an END frame with
cancelled=true is emitted. EOF on stdin exits cleanly.
"""

import json
import signal
import struct
import sys

from piper import PiperVoice, SynthesisConfig

MSG_READY = 0x01
MSG_AUDIO = 0x02
MSG_END = 0x03
MSG_ERROR = 0x04

_cancel_requested = False


def _write_frame(msg_type, payload=b""):
    body = struct.pack(">I", len(payload) + 1) + bytes([msg_type]) + payload
    sys.stdout.buffer.write(body)
    sys.stdout.buffer.flush()


def _write_json(msg_type, obj):
    _write_frame(msg_type, json.dumps(obj).encode("utf-8"))


def _on_sigusr1(_signum, _frame):
    global _cancel_requested
    _cancel_requested = True


def _synthesize(voice, text, length_scale):
    global _cancel_requested
    _cancel_requested = False
    config = SynthesisConfig(length_scale=length_scale)
    cancelled = False
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if _cancel_requested:
            cancelled = True
            break
        for chunk in voice.synthesize(line, config):
            _write_frame(MSG_AUDIO, chunk.audio_int16_bytes)
            if _cancel_requested:
                cancelled = True
                break
        if cancelled:
            break
    _write_json(MSG_END, {"cancelled": cancelled})


def _handle_request(voice, request):
    text = request["text"]
    length_scale = request.get("length_scale", 1.0)
    if length_scale is None:
        length_scale = 1.0
    _synthesize(voice, text, float(length_scale))


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("usage: piper_server.py <model.onnx>\n")
        sys.exit(2)

    model_path = sys.argv[1]
    signal.signal(signal.SIGUSR1, _on_sigusr1)

    voice = PiperVoice.load(model_path)
    _write_json(MSG_READY, {"sample_rate": voice.config.sample_rate})

    for raw_line in sys.stdin:
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        try:
            request = json.loads(raw_line)
            _handle_request(voice, request)
        except Exception as exc:
            _write_frame(MSG_ERROR, str(exc).encode("utf-8"))


if __name__ == "__main__":
    main()
