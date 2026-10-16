"""Wrap a CLI-exported SAC spec in a non-executable Wasm custom section for bindings."""
import base64
from pathlib import Path


def leb(number):
    result = bytearray()
    while number >= 128:
        result.append((number & 127) | 128)
        number >>= 7
    result.append(number)
    return bytes(result)


root = Path(__file__).resolve().parent.parent
name = b"contractspecv0"
spec = base64.b64decode((root / "scripts/abi/test-usdc-sac.xdr-base64").read_text(), validate=False)
payload = leb(len(name)) + name + spec
target = root / "target/test-usdc-sac-interface.wasm"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(b"\x00asm\x01\x00\x00\x00\x00" + leb(len(payload)) + payload)
