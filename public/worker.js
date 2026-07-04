importScripts('./chdman.js');

const CHUNK_SIZE = 64 * 1024 * 1024;

function buildArgs(mediaType, compression, inputPath, outputPath) {
  const compFlag = compression === 'none' ? ['--compression', 'none'] : ['--compression', compression];

  switch (mediaType) {
    case 'cd':
      return ['createcd', '--input', inputPath, '--output', outputPath, ...compFlag];
    case 'dvd':
      return ['createdvd', '--input', inputPath, '--output', outputPath, ...compFlag];
    case 'hd':
    default:
      return ['createhd', '--input', inputPath, '--output', outputPath, ...compFlag];
  }
}

async function writeOpfsInChunks(module, virtualPath, outputName, onProgress) {
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(outputName, { create: true });
  const writable = await fileHandle.createSyncAccessHandle();

  const stat = module.FS.stat(virtualPath);
  const totalSize = stat.size;
  const fd = module.FS.open(virtualPath, 'r');

  let offset = 0;

  while (offset < totalSize) {
    const chunkSize = Math.min(CHUNK_SIZE, totalSize - offset);
    const buf = new Uint8Array(chunkSize);
    module.FS.read(fd, buf, 0, chunkSize, offset);
    writable.write(buf, { at: offset });
    offset += chunkSize;
    onProgress(offset / totalSize);
  }

  module.FS.close(fd);
  writable.close();

  return totalSize;
}

self.addEventListener('message', async (e) => {
  const { type, file, mediaType, compression, outputName } = e.data;
  if (type !== 'convert') return;

  const post = (msg) => self.postMessage(msg);

  try {
    post({ type: 'progress', pct: 5, label: 'Carregando chdman.wasm...' });

    const module = await ChdmanModule({
      print: (text) => {
        post({ type: 'log', text, level: '' });
        const match = text.match(/(\d+(\.\d+)?)%/);
        if (match) {
          const pct = 10 + parseFloat(match[1]) * 0.8;
          post({ type: 'progress', pct, label: 'Convertendo...' });
        }
      },
      printErr: (text) => {
        const level = /error/i.test(text) ? 'err' : /warn/i.test(text) ? 'warn' : '';
        post({ type: 'log', text, level });
      },
    });

    post({ type: 'progress', pct: 10, label: 'Montando arquivo de entrada...' });

    module.FS.mkdir('/input');
    module.FS.mkdir('/output');

    module.FS.mount(module.WORKERFS, { files: [file] }, '/input');

    const inputPath  = `/input/${file.name}`;
    const outputPath = `/output/${outputName}`;

    post({ type: 'log', text: `Input:  ${file.name} (${file.size} bytes)` });
    post({ type: 'log', text: `Output: ${outputName}` });
    post({ type: 'progress', pct: 12, label: 'Iniciando chdman...' });

    const args = buildArgs(mediaType, compression, inputPath, outputPath);
    post({ type: 'log', text: `chdman ${args.join(' ')}` });

    const exitCode = module.callMain(args);

    if (exitCode !== 0) {
      throw new Error(`chdman saiu com código ${exitCode}`);
    }

    post({ type: 'progress', pct: 90, label: 'Salvando no armazenamento local...' });

    const outputSize = await writeOpfsInChunks(
      module,
      outputPath,
      outputName,
      (ratio) => {
        const pct = 90 + ratio * 9;
        post({ type: 'progress', pct, label: 'Gravando CHD...' });
      }
    );

    module.FS.unmount('/input');
    module.FS.unlink(outputPath);

    post({
      type: 'done',
      outputName,
      opfsPath: outputName,
      inputSize: file.size,
      outputSize,
    });

  } catch (err) {
    post({ type: 'error', message: err.message || String(err) });
  }
});
