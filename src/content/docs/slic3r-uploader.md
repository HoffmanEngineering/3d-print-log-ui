---
slug: slic3r-uploader
title: OrcaSlicer, PrusaSlicer & Bambu Uploader | 3D Print Log Docs
description: Use the post-processing uploader to send prints from OrcaSlicer, PrusaSlicer, and Bambu Studio to 3D Print Log automatically. Setup guide.
navLabel: Send prints from your slicer
group: integrations
order: 60
mode: how-to
updated: 2026-09-02
related: [prints]
---

## Uploader for Slic3r-based Slicers (OrcaSlicer/PrusaSlicer/Bambu Studio/SuperSlicer)

---

3D Print Log can receive print information from Slic3r-based slicers like
OrcaSlicer, PrusaSlicer, Bambu Studio, and SuperSlicer. This is using a
post-processing script that sends the print information to 3D Print Log.

The post-processing script is a small program that runs after the slicing
process is complete. It reads the G-code file and sends the print information to
3D Print Log. This includes the file name, print time, settings and filament
usage. The uploader will then open a browser window to the 3D Print Log website
where you can see the print information and settings. You can make any
adjustments needed before saving the print.

---

### Download and Installation

Download the <a
href="https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/releases"
>latest release of the Slic3rPostProcessingUploader for your operating system</a
>, and save the file to a location on your computer.

In the Slicer's 'Post-Processing Scripts' section, add the path to this file.
Full/Absolute paths are recommended:

#### Windows

C:\\uploader\\Slic3rPostProcessingUploader.exe [options]

#### Linux

/home/user/uploader/Slic3rPostProcessingUploader [options]

#### macOS

/Users/user/uploader/Slic3rPostProcessingUploader [options]

---

### Options

See all supported options on <a
href="https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/tree/main?tab=readme-ov-file#options"
>the README</a >

---

### Troubleshooting

Use absolute/full paths when adding the script to the slicer. Relative paths may
not work as expected.

Please report any bugs or issues either by creating an issue on <a
href="https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/issues"
>the project's github page</a >, or by submitting a bug report through the
[Feedback](/feedback) page.

If you need further help, please contact us through the [Feedback](/feedback)
and we'll be happy to help.
