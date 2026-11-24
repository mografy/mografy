# Output: aspect ratio, portrait films and export

Read this when the brief names an aspect ratio, a social platform, a portrait (9:16) video, or an export size or format.

## Landscape and portrait compositions

Read `mografy.json.aspectRatio` before planning or editing. It is `"16:9"` (landscape) or `"9:16"` (portrait); when absent, use the scene's `meta.width / meta.height`. This is canvas configuration only. The main player has no orientation switch: it previews the authored scene at its configured dimensions. Output orientation is chosen only in the Export dialog and never changes the project or the main preview.

When the user requests a future 9:16 video, explicitly record **9:16 portrait** in the brief before authoring. Treat this as the intended composition, not merely an export setting. Create the scene natively in portrait, tell the user that the preview follows the authored scene, and do not rely on fitting or cropping a landscape scene to satisfy a portrait brief. For a native social video, author `meta = { width: 1080, height: 1920, ... }` and set `aspectRatio: "9:16"` in the project. A landscape scene normally uses 1920 × 1080. The shared Runtime applies the saved aspect ratio to the logical canvas before setup and rendering, preserving the scene's short edge; both `SetupContext` and `FrameContext` receive the effective dimensions. Use `ctx.width` and `ctx.height`, never imported meta dimensions, for layout, backgrounds, clipping, and camera bounds. Branch with `const portrait = ctx.height > ctx.width` when the compositions differ. Stack portrait elements vertically, wrap copy to available width, and reposition the focal subject and subtitles. Do not rotate, stretch, or merely shrink a complete landscape shot into the portrait canvas. Fixed-coordinate scenes need a scene-code layout pass; an orientation toggle cannot infer their intended design.

For portrait social layouts, use conservative guides: leave about 8% above, 18% below, 6% on the left, and 12% on the right clear of critical copy and logos. Platform overlays vary; treat these as planning margins, not platform guarantees. Inspect at phone size, including long subtitles, entrances, exits, and transitions. If both outputs are requested, review both complete compositions and random seeks.

MP4, WebM and MOV exports have landscape 1280 × 720 / 1920 × 1080 and portrait 720 × 1280 / 1080 × 1920 presets, selected with orientation icons. If output orientation differs from the authored scene, show Fit: `contain` (Fit entire scene, the default) or `cover` (Fill and crop). These fit the existing artwork without reauthoring the canvas. The dialog shows an actual paused-frame preview of the output. Choose `reflow` (Adapt layout) for deliberately responsive scenes, including all sixteen built-in components: it passes the output canvas dimensions to scene code so portrait sizes, card arrangements, and text wrapping adapt. It is not a player orientation control. Export overrides do not change the saved canvas. CLI: `npx mografy export [project] --format mp4 --orientation portrait --resolution 1080p` (or `landscape`); without overrides it uses the saved canvas and render scale. WebM uses VP9 video and optional Opus audio, with constant quality (CRF 32) by default; MP4 uses 10-bit H.265 (HEVC, tagged `hvc1`) with 48 kHz AAC by default, about half the size of H.264 at the same look. `--preset share`, Encoder → Share in the Export dialog, `--codec h264` or `render.codec: "h264"` in `mografy.json` gives H.264 for a website `<video>`, Firefox or Windows PCs without HEVC support; ask which when the file is going somewhere other than QuickTime, a phone or a social upload. MP4 `crf` and `bitrate` are on the H.264 scale for both codecs. Use `--format webm` for WebM. Higher WebM CRF values produce smaller files with less detail. MP4 and VP9 CRF values are codec-specific. Both video formats support the same orientation, resolution, sampling, and output effects. Player, stills, thumbnails, review, and exports share the effective canvas and output effects.

## Export

Export with `npx mografy export [project] --format mp4|webm|mov|lottie|svga`, or `--preset share|high|fast|master`: `share` is H.264 for any player, `high` (the default) H.265 10-bit, `fast` the hardware H.265 encoder (VideoToolbox, NVENC, Quick Sync, AMF; software fallback), `master` ProRes 422 HQ in a MOV for editing. Ask which when the destination is unclear: a website, Firefox or an unknown Windows PC needs `share`. The command prints capture and encoding or packaging progress and writes the finished file under `renders/`. Press Ctrl+C to cancel a CLI export. When `npx mografy dev` is running, player exports also print progress in that terminal and can be stopped with `npx mografy export [project] --cancel`. Batch export: `npx mografy export <project> <project>...` or `npx mografy export --all [folder]` (default: the projects folder; `_`-prefixed folders skipped) exports each in turn with the same options, skips past failures and prints a summary; in the player, **Batch** next to **Export** opens the same as a dialog (format, encoder, resolution Own/720p/1080p by shorter side, frame rate, Use less memory). Export only when the user asks for a file.

## Export details

Read this section when the user asks about a preset, codec, size, frame rate, the Export dialog or a setting; the paragraphs above are enough for an ordinary export.

```sh
npx mografy export projects/my-film --format mp4                 # H.265 10-bit (preset high)
npx mografy export projects/my-film --preset share               # H.264, plays everywhere
npx mografy export projects/my-film --preset fast                # hardware H.265
npx mografy export projects/my-film --preset master              # ProRes 422 HQ MOV
npx mografy export projects/my-film --format webm
npx mografy export projects/my-film --format mp4 --orientation portrait --resolution 1080p
npx mografy export projects/my-film --format lottie -o preview.lottie.json
npx mografy export projects/my-film --format svga -o preview.svga
npx mografy export projects/intro projects/launch --preset share  # batch: one after another
npx mografy export --all                                          # batch: every project in projects/
```

| Preset | Output | Use it for |
| --- | --- | --- |
| `share` | MP4, H.264 8-bit | Any browser, Windows PCs, chat apps and social uploads |
| `high` (default) | MP4, H.265 10-bit, tagged `hvc1` | Smallest file at the same look; QuickTime, Safari, iOS, Android, Chrome and Edge with hardware decoding, YouTube, Instagram, TikTok |
| `fast` | MP4, hardware H.265 10-bit, GPU-drawn | Quick exports: VideoToolbox on macOS, NVIDIA NVENC, Intel Quick Sync or AMD AMF on Windows; software fallback elsewhere |
| `master` | MOV, ProRes 422 HQ 10-bit, PCM audio | Editing in Final Cut, Premiere or DaVinci Resolve |

H.265 at the same CRF matched H.264's quality at about 50–58 % of the file size in Mografy's tests, at the same encoding time. Firefox and some Windows PCs play HEVC only with hardware support or the HEVC Video Extensions, so a website `<video>` or a file for unknown players needs `share`. Constant quality encodes while frames are captured, so there is no separate encoding wait; two-pass target bitrate is under Advanced settings. Audio is 48 kHz (AAC in MP4, Opus 128 kbps in WebM). Exports behave the same on macOS, Windows and Linux, and the finished file names the encoder that wrote it.

**WebM** uses VP9 at constant quality. Quality presets in the dialog:

| Quality | VP9 CRF | Motion samples | Encoder speed |
| --- | --- | --- | --- |
| Draft | 38 | 1 | Very fast (glow and grain off) |
| Standard | 32 | 4 | Medium |
| High | 26 | 8 | Slow |

Lower CRF keeps more detail and makes larger files; constant quality does not guarantee a size. CRF values are codec-specific, so compare real outputs, not MP4 and WebM numbers.

**Lottie and SVGA** package embedded PNG frames: Canvas artwork and effects are kept, but there are no editable vector layers and no audio. Lottie writes `.lottie.json`; SVGA writes compressed SVGA 2 protobuf.

**Sizes** in the Export dialog:

| Format | Sizes |
| --- | --- |
| Lottie | 256 × 256 square; 640 × 360 landscape |
| SVGA | 375 × 375 square; 375 × 750 portrait |
| MP4 / WebM / MOV landscape | 1280 × 720; 1920 × 1080 |
| MP4 / WebM / MOV portrait | 720 × 1280; 1080 × 1920 |

**Fit**, shown when the output aspect differs from the scene: **Fit entire scene** (`contain`, default) centres the whole artwork on the scene background; **Fill and crop** (`cover`) fills the output and crops the edges; **Adapt layout** (`reflow`) gives responsive scene code the output dimensions so it rearranges itself. All sixteen built-in components support both orientations with Adapt layout; a custom scene rearranges only if it lays out from `ctx.width` and `ctx.height`. CLI `--orientation` and `--resolution` use Fit entire scene; `--orientation` alone means 720p and `--resolution` alone means landscape; without them the CLI uses the project's render scale. Portrait files default to `name-portrait.mp4`. Output choices never change the main preview or saved settings.

**Frame rates:** up to 60 fps for MP4, WebM and MOV, 30 fps for Lottie and SVGA. The player, API, CLI and render functions enforce the same limits.

**Progress and cancelling:** the CLI prints capture and encoding progress; Ctrl+C cancels a CLI export and cleans up. A player export shows frame-capture progress and elapsed time in its dialog; **Hide** moves it into a toast with **View** and **Cancel**, and `npx mografy export [project] --cancel` stops it from a terminal. Finished MP4 and WebM files can be played and downloaded in the dialog; **Last export** reopens the result. **Batch** next to **Export** queues several films with one set of options (format, encoder, resolution Own/720p/1080p by shorter side, frame rate, *Use less memory*); a corner card follows the queue, and switching projects does not stop it. A failed film in a batch is reported while the rest continue.

## Export settings

Video export settings live under `render` in `mografy.json`; the Export dialog and `--preset` override them for one export without saving.

| Setting | Default | Purpose |
| --- | --- | --- |
| `codec` | `h265` | MP4 codec: `h265` (10-bit) or `h264` |
| `encoding` | `crf` | `crf` constant quality, `two-pass` target `bitrate`, or `hardware` (GPU encoder, software fallback) |
| `crf`, `preset`, `bitrate` | `18`, `medium`, `12M` | Software encoder quality and speed; MP4 values are on the H.264 scale for both codecs |
| `hardwareQuality` | `65` | Hardware encoder quality, 1–100 |
| `canvas` | `cpu` | Where export frames are drawn: `cpu` or `gpu` (macOS and Windows) |
| `workers` | `auto` | Parallel capture segments, or 1–8. `auto`: one per two CPU cores (at most 6), within 40 % of memory (0.9 GB shared plus about 1.3 GB per segment at 1080p). `--workers 1` uses the least memory for one export |
| `samples`, `mixing` | `4`, `srgb` | Motion samples per frame and the space they mix in |
| `shutter` | `360` | Shutter angle in degrees; `180` gives shorter, film-like motion blur |
| `sampleWindow` | `after` | `centred` places each frame's samples around its own time, in step with the audio |
| `adaptiveSamples` | `false` | Mix only two samples where a frame barely changes |
| `dither` | `false` | Ordered dither before 8-bit rounding, against banding in soft gradients |
| `glow`, `grain` | `0.12`, `0.008` | Output effects |
| `includeAudio` | `true` | Add the project's audio (48 kHz) |

`shutter`, `sampleWindow`, `adaptiveSamples` and `dither` change the picture, so they stay off or at their old values unless a project or export turns them on. A file too large to share: [video-compression.md](https://github.com/mografy/mografy/blob/main/.agents/skills/mografy/references/video-compression.md).
