# Third-party attribution and provenance

This project contains bundled third-party source and an adapted TinyUZ encoder. It is not an entirely original protocol implementation. Original SignalRGB integration, batching/control fixes, telemetry panel drawing, build script, and mocked tests use the MIT license in `LICENSE`. Third-party copyright notices remain applicable to their respective portions.

## Adapted implementation and protocol references

### andyjusa — hydroshift2-rs (MIT)

Copyright (c) 2026 andyjusa. Full notice: `hydroshift2-rs-LICENSE.txt`.

Pinned reference: [`5b5c95d68d264fca0ddd642f61b5fc4d43481c3a`](https://github.com/andyjusa/hydroshift2-rs/tree/5b5c95d68d264fca0ddd642f61b5fc4d43481c3a).

- [`src/compression.rs`](https://github.com/andyjusa/hydroshift2-rs/blob/5b5c95d68d264fca0ddd642f61b5fc4d43481c3a/src/compression.rs): `TinyWriter`, `longest_match`, and the pure Rust compressor were ported/adapted into JavaScript `tinyuz()`. The port uses individual literals instead of literal-line blocks, keeps the 127-byte match distance limit, and runs inside SignalRGB.
- [`src/protocol.rs`](https://github.com/andyjusa/hydroshift2-rs/blob/5b5c95d68d264fca0ddd642f61b5fc4d43481c3a/src/protocol.rs): source of the DES-CBC header format, public device key/IV, command fields, and RGB payload layout, adapted in `packet()` and `upload()` using CryptoJS and SignalRGB bulk transfers. The plugin uses a monotonic sequence field instead of the reference timestamp computation.
- [`src/controller.rs`](https://github.com/andyjusa/hydroshift2-rs/blob/5b5c95d68d264fca0ddd642f61b5fc4d43481c3a/src/controller.rs): command/session, JPEG upload, and LCD backlight references.

The Rust library, USB backend, and pump-control implementation are not bundled.

### sgtaziz — lian-li-linux (MIT)

Copyright (c) 2026 sgtaziz. Full notice: `lian-li-linux-LICENSE.txt`.

Pinned reference: [`7c0de10cc47be1836adc2d6813f6f509910eb1f9`](https://github.com/sgtaziz/lian-li-linux/tree/7c0de10cc47be1836adc2d6813f6f509910eb1f9).

- [`crates/lianli-devices/src/winusb/h2_aio.rs`](https://github.com/sgtaziz/lian-li-linux/blob/7c0de10cc47be1836adc2d6813f6f509910eb1f9/crates/lianli-devices/src/winusb/h2_aio.rs): reference for the A034 controller, command `0xFA`, coolant byte 13, big-endian pump RPM bytes 20/21, ring upload/recovery behavior, and device timing.
- The project's WinUSB LCD/protocol code was studied for JPEG acknowledgement and screen operation. The plugin implements these through its own `query()`, `readReply()`, `sendLCD()`, and `telemetry()` functions. Its acknowledged-JPEG path differs from the reference H.264 stream transport.

No service, daemon, executable, or compiled code from this project is bundled. The license is retained for the protocol/adaptation reference.

### housisong (sisong) — TinyUZ (MIT)

Copyright (c) 2012-2022 housisong. Full notice: `TinyUZ-LICENSE.txt`.

Upstream: [sisong/tinyuz](https://github.com/sisong/tinyuz), reference tool version `v1.1.1`.

The plugin emits the TinyUZ format using the JavaScript port above. The official CLI was used only for offline compression/decompression comparison during development. No TinyUZ executable is distributed or invoked at runtime.

## Bundled library source

### CryptoJS 4.2.0 (MIT)

Copyright (c) 2009-2013 Jeff Mott; Copyright (c) 2013-2016 Evan Vosberg.

- Source: [brix/crypto-js, 4.2.0](https://github.com/brix/crypto-js/tree/4.2.0).
- `crypto-js.js` matches `package/crypto-js.js` in the official npm `crypto-js@4.2.0` tarball byte-for-byte.
- SHA-256: `ee02257ffbaf0a9b481c7039b0f3bb20c360c9674fe4be8b38ae709b2ea59bbe`.
- `build.js` removes the UMD wrapper and wraps the factory body for SignalRGB. The cryptographic implementation is retained.
- Full license: `CryptoJS-LICENSE.txt`.

### jpeg-js 0.4.4 encoder (BSD-3-Clause)

Copyright (c) 2014 Eugene Ware. The encoder also retains Copyright (c) 2008 Adobe Systems Incorporated and the Andreas Ritter JavaScript port credit from 2009.

- Source: [jpeg-js/jpeg-js, v0.4.4](https://github.com/jpeg-js/jpeg-js/tree/v0.4.4).
- `jpeg-encoder.js` matches `package/lib/encoder.js` in the official npm `jpeg-js@0.4.4` tarball byte-for-byte.
- SHA-256: `00bde8df2517eca556669ab6fc27b414e9ba3fc52a0a71e1e37ec7c5f19c3d34`.
- `build.js` omits the final CommonJS/browser export section. The encoder and Adobe BSD notice are retained.
- Full project license: `jpeg-js-LICENSE.txt`; complete Adobe notice in `jpeg-encoder.js` and the generated plugin.

## Standalone distribution

`build.js` embeds all six project/third-party license notices in the prebuilt plugin, so downloading only `HydroShift_II_S_Native.js` still retains copyright and permission notices. The Adobe notice is retained in the encoder section.

`@SignalRGB/lcd` is supplied by SignalRGB; it is imported, not redistributed. SignalRGB and Lian Li names identify compatibility and do not imply endorsement.

The DES key/IV is a public device-protocol constant, not a user credential. The public package contains no account token, device serial number, private image, capture log, or machine-specific file path.
