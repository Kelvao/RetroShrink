# RetroShrink

RetroShrink is a web interface for converting ROMs into CHD images directly in the browser using `chdman` compiled to WebAssembly.

## What it is

A static application that allows you to:
- load a local ROM file
- choose media type (CD, DVD, GDI, HD/RAW)
- select compression (`cdlz`, `zstd`, `zlib`, `cdzl`, `cdfl`, `none`)
- convert directly in the browser without uploading to servers
- save the result locally via OPFS/download

## Repository Structure

- `public/`
  - `index.html` - main app interface
  - `main.js` - frontend logic and worker communication
  - `worker.js` - worker executing the `chdman` WebAssembly
  - `chdman.js` - Emscripten generated JavaScript glue code
  - `chdman.wasm` - compiled WebAssembly binary
  - `_headers` - headers configuration for static deploy
- `.github/workflows/build-chdman-wasm.yml` - pipeline to compile `chdman` to WASM

## How to Use

The app is static and must be served via HTTP for the `Worker` and resources to function properly. Both `chdman.js` and `chdman.wasm` are required and served from the `public/` directory.

1. Serve `public/` with a simple HTTP server.
2. Open your browser at `http://localhost:PORT`.
3. Drag or select a ROM.
4. Click `Convert to CHD`.
5. Download the generated CHD.

### Quick Example with Python

    cd public
    python3 -m http.server 8000

Access at `http://localhost:8000`.

## WASM Build

The `chdman.js` and `chdman.wasm` files are served directly from the `public/` directory. The automated compilation for these files is configured in:

- `.github/workflows/build-chdman-wasm.yml`

This workflow checks out MAME, installs dependencies, configures Emscripten, and generates both the `chdman.js` and `chdman.wasm` files, placing them into the public folder.

## Important Notes

- Conversion is performed locally in the browser, with no file uploads.
- The app uses the browser's local storage (OPFS) to write the CHD before downloading.
- As a static frontend, it can be hosted on services like Netlify, Vercel, or GitHub Pages as long as both the WASM and JS files are served correctly from the public directory.

## Credits

This project relies heavily on the core components of the **MAME** project. 

Special thanks to:
* [**Nicola Salmoria**](https://github.com/nsalmoria) (and early core team members) for creating and initiating the MAME project.
* [**The MAME Development Team**](https://github.com/mamedev) for their continuous effort in maintaining and expanding the project.
* [**All MAME contributors**](https://github.com/mamedev/mame/graphs/contributors) for their decades of dedicated work in digital preservation and creating the `chdman` tool.

<br/>
<div align="center">
  <a href="https://www.mamedev.org/">
    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c3/MAMELogo.svg" alt="MAME" width="800"/>
  </a>
</div>
