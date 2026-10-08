# Changelog

## 0.1.0 — 2026-10-08

Initial public package of the locally tested native plugin.

- Native USB control for the 24-LED ring and 480×480 JPEG LCD.
- Native SignalRGB LCD theme/image interface and hardware backlight control.
- Read-only coolant/pump telemetry and an optional built-in information panel.
- Clear stale ring batches on brightness and forced-color changes.
- Send zero brightness as a single black frame.
- Settle sustained black canvas output into a single frame; resume with a fresh color frame, avoiding repeated play/pause flashes.
- Include reproducible offline build and mocked regression tests.

Verified on one HydroShift II LCD-S unit with USB `1CBE:A034`, firmware `lianlih2s_0001_0027`, and SignalRGB 2.5.74. Boot-time ownership and physical GIF playback remain unverified.
