# HydroShift II S native plugin for SignalRGB

[简体中文](README.zh-CN.md)

Experimental, community-made SignalRGB plugin for the **Lian Li HydroShift II LCD-S**. It controls the pump-head LED ring and LCD directly through SignalRGB's native USB plugin interface. No bridge, background service, media importer, or separate executable is needed at runtime.

This is an unofficial implementation. It is not affiliated with Lian Li or SignalRGB.

## Tested hardware

| Item | Tested value |
| --- | --- |
| USB vendor/product | `1CBE:A034` |
| USB product string | `lianli-H2S-1.7` |
| Firmware | `lianlih2s_0001_0027` |
| Ring | 24 RGB LEDs |
| LCD | 480 × 480 pixels |
| SignalRGB | 2.5.74 on Windows |

Only one physical LCD-S unit has been tested. Other HydroShift generations, variants, USB IDs, and firmware versions have not been verified. The plugin matches only the USB ID above.

## Features

- Ring colors from the SignalRGB canvas, or a forced static color.
- Device brightness and a separate ring brightness control.
- Replaces the onboard loop with black when brightness is zero.
- Handles canvas play/pause without replaying the previous bright/black transition batch. The tester confirmed the extra flashes were resolved.
- Native SignalRGB LCD themes, including their supported sensor and background settings.
- Images and GIFs selected using SignalRGB's own LCD file picker.
- LCD hardware backlight control, separate from rendered image brightness.
- Optional built-in coolant temperature / pump RPM display, with layout and color controls.
- Read-only coolant temperature and pump RPM telemetry.

The plugin does not write pump/fan speeds, update firmware, or reset the controller.

## Install

See SignalRGB's [custom plugin installation guide](https://docs.signalrgb.com/troubleshooting/advanced-troubleshooting/replacing-plugin/). Custom plugins persist across application updates; remove this override if you later want to use an official plugin for the same device.

1. Download `HydroShift_II_S_Native.js`.
2. Put it in a subfolder of your SignalRGB custom plugins directory, normally `Documents\WhirlwindFX\Plugins\H2S_Local\`.
3. Keep only **one** custom plugin matching `1CBE:A034`. If you previously installed the experimental `H2S_Native_Probe.js`, move that old file outside the plugins directory before installing this file.
4. Close L-Connect's UI and stop any L-Connect service holding this controller. Allow SignalRGB to own the USB device exclusively.
5. Fully exit and reopen SignalRGB. Look for **Lian Li HydroShift II S (Experimental)**.
6. Place the device inside the lighting canvas and choose `Canvas` or `Forced` as its lighting source.

The prebuilt JS file contains its runtime libraries. Copying `build.js`, the unbundled source, or the development libraries into SignalRGB is unnecessary; install only the prebuilt plugin.

## LCD images and themes

In the device settings, enable screen control and choose `SignalRGB LCD` as the screen source. Then open the device's **LCD** tab.

For a local image or GIF:

1. Select a theme that supports a configurable background, such as the built-in SignalRGB Logo theme.
2. Set **Background Type** to **`image`**.
3. Use **Media File Path → Browse** to select your PNG, JPEG, or GIF.
4. In the Logo theme, set **Display Item** to **None** if you want the image unobstructed.

`media` is not the local image/GIF file-picker option. Themes without configurable background support do not expose this picker.

GIF frames were observed changing in SignalRGB's native preview, and the controller continuously acknowledged JPEG frame uploads. Physical GIF playback has not yet been independently confirmed by the tester.

Use **screen hardware brightness** in the device settings to adjust the LCD backlight. The upload frame rate defaults to 5 FPS and can be set from 1–15; higher settings have not been thoroughly tested. Theme/image rendering brightness in the LCD tab is a separate control.

Choosing `Coolant + Pump` instead displays the plugin's own read-only telemetry panel. Its layout and colors are controlled in the device settings; SignalRGB's native LCD preview does not show this mode.

## Known limitations

- Ring effects are uploaded as short onboard animation batches, with approximately 1–2 seconds of latency. This is not a fully synchronized, per-frame RGB stream.
- Sustained all-black canvas output settles into a single black frame after about 150 ms. Brief black pulses remain batched; effects with longer black sections may switch between static black and resumed animation, and timing can differ from the canvas.
- Canvas pause is inferred from sustained black output; the plugin does not directly subscribe to SignalRGB's global play/pause state.
- LCD and RGB share one USB interface. A failed recovery check pauses RGB uploads; LCD uploads pause after repeated missing acknowledgements. Disable/re-enable the device or restart SignalRGB to retry.
- Boot-time ownership has not been tested. Automatically starting L-Connect services may claim the USB device even when its UI is closed.
- On exit/disable, the ring animation is replaced with the current sampled color, or black when suspended, disabled, or at zero brightness.
- Third-party LCD themes may have their own feature restrictions. This plugin does not bypass SignalRGB licensing.

## Development and tests

Requires Node.js only for building/testing; Node.js is not used when the installed plugin runs.

```sh
npm run build
npm test
```

There are no npm dependencies. `build.js` bundles the included CryptoJS and JPEG encoder with `h2s_native_logic.js`. `test.js` covers stale frame clearing, zero brightness, slider coalescing, canvas pause/resume, pause at a batch boundary, intentional short black pulses, and shutdown behavior. These tests use a mocked device and do not prove USB or physical display behavior.

For reports, include the model, USB VID/PID, firmware version, SignalRGB version, affected control/effect, and a short device-console excerpt. Remove serial numbers, personal file paths, and private images from reports.

## Credits and licenses

- **andyjusa** — [hydroshift2-rs](https://github.com/andyjusa/hydroshift2-rs), MIT: RGB/DES protocol adaptation and a JavaScript port of its Rust TinyUZ encoder.
- **sgtaziz** — [lian-li-linux](https://github.com/sgtaziz/lian-li-linux), MIT: A034/JPEG/telemetry and USB recovery protocol references.
- **housisong (sisong)** — [TinyUZ](https://github.com/sisong/tinyuz), MIT: format; official v1.1.1 CLI used for offline validation only.
- **Jeff Mott, Evan Vosberg / CryptoJS contributors** — bundled [CryptoJS 4.2.0](https://github.com/brix/crypto-js/tree/4.2.0), MIT.
- **Eugene Ware / jpeg-js contributors; Adobe Systems Incorporated; Andreas Ritter** — bundled [jpeg-js 0.4.4 encoder](https://github.com/jpeg-js/jpeg-js/tree/v0.4.4), BSD-3-Clause, with Adobe notice and JavaScript port credit retained.

Original integration/build/test code is provided under MIT. Adapted and bundled portions retain their third-party notices. Complete licenses are included both as files and inside the standalone prebuilt plugin. See [NOTICE.md](NOTICE.md) for pinned source commits, specific files, modifications, and verified library hashes.
