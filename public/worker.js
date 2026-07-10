const CHUNK_SIZE = 64 * 1024 * 1024;

function buildArgs(mediaType, compression, inputPath, outputPath) {
  const compFlag = compression === 'none' ? ['--compression', 'none'] : ['--compression', compression];

  switch (mediaType) {
    case 'cd':
      return ['createcd', '--input', inputPath, '--output', outputPath, ...compFlag];
    case 'dvd':
      return ['createdvd', '--input', inputPath, '--output', outputPath, ...compFlag];
    case 'gdi':
      return ['createcd', '--input', inputPath, '--output', outputPath, ...compFlag];
    case 'hd':
    default:
      return ['createhd', '--input', inputPath, '--output', outputPath, ...compFlag];
  }
}

async function mountInputFiles(FS, files) {
  if (!FS.analyzePath('/input').exists) {
    FS.mkdir('/input');
  }

  for (const file of files) {
    const data = new Uint8Array(await file.arrayBuffer());
    try {
      FS.writeFile(`/input/${file.name}`, data, { canOwn: true });
    } catch (err) {
      throw new Error(`Falha ao gravar arquivo de entrada ${file.name}: ${err.message || err}`);
    }
  }
}

async function writeOpfsInChunks(FS, virtualPath, outputName, onProgress) {
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(outputName, { create: true });
  const writable = await fileHandle.createSyncAccessHandle();

  const stat = FS.stat(virtualPath);
  const totalSize = stat.size;
  const fd = FS.open(virtualPath, 'r');

  let offset = 0;

  while (offset < totalSize) {
    const chunkSize = Math.min(CHUNK_SIZE, totalSize - offset);
    const buf = new Uint8Array(chunkSize);
    FS.read(fd, buf, 0, chunkSize, offset);
    writable.write(buf, { at: offset });
    offset += chunkSize;
    onProgress(offset / totalSize);
  }

  FS.close(fd);
  writable.close();

  return totalSize;
}

const chdmanReady = new Promise((resolve, reject) => {
  self.Module = {
    noExitRuntime: true,
    noInitialRun: true,
    print: (text) => {
      self.postMessage({ type: 'log', text, level: '' });
      const match = text.match(/(\d+(\.\d+)?)%/);
      if (match) {
        const pct = 10 + parseFloat(match[1]) * 0.8;
        self.postMessage({ type: 'progress', pct, label: 'Convertendo...' });
      }
    },
    printErr: (text) => {
      const level = /error/i.test(text) ? 'err' : /warn/i.test(text) ? 'warn' : '';
      self.postMessage({ type: 'log', text, level });
    },
    onRuntimeInitialized: () => resolve(self.Module),
    locateFile: (path) => {
      if (path.endsWith('.wasm')) return 'chdman.wasm';
      return path;
    },
  };
});

importScripts('./chdman.js');

self.addEventListener('message', async (e) => {
  const { type, files, indexFileName, mediaType, compression, outputName } = e.data;
  if (type !== 'convert') return;

  const post = (msg) => self.postMessage(msg);

  try {
    post({ type: 'progress', pct: 5, label: 'Carregando chdman.wasm...' });

    const module = await chdmanReady;
    const FS = self.FS || module.FS;
    if (typeof FS === 'undefined') {
      throw new Error('FS runtime não está disponível');
    }
    module.FS = FS;

    post({ type: 'progress', pct: 10, label: 'Montando arquivo de entrada...' });

    if (!FS.analyzePath('/output').exists) {
      FS.mkdir('/output');
    }

    await mountInputFiles(FS, files);

    const inputPath = `/input/${indexFileName}`;
    const outputPath = `/output/${outputName}`;

    const totalInputSize = files.reduce((sum, f) => sum + f.size, 0);
    for (const f of files) {
      post({ type: 'log', text: `Input:  ${f.name} (${f.size} bytes)` });
    }
    post({ type: 'log', text: `Output: ${outputName}` });
    post({ type: 'progress', pct: 20, label: 'Iniciando chdman...' });

    const args = buildArgs(mediaType, compression, inputPath, outputPath);
    post({ type: 'log', text: `chdman ${args.join(' ')}` });

    let exitCode;
    try {
      exitCode = module.callMain(args);
    } catch (err) {
      const decoded = module.getExceptionMessage ? module.getExceptionMessage(err) : String(err);
      throw new Error(`chdman lançou uma exceção: ${decoded}`);
    }
    
    if (exitCode !== 0) {
      throw new Error(`chdman saiu com código ${exitCode}`);
    }

    post({ type: 'progress', pct: 90, label: 'Salvando no armazenamento local...' });

    const outputSize = await writeOpfsInChunks(
      FS,
      outputPath,
      outputName,
      (ratio) => {
        const pct = 90 + ratio * 9;
        post({ type: 'progress', pct, label: 'Gravando CHD...' });
      }
    );

    post({
      type: 'done',
      outputName,
      opfsPath: outputName,
      inputSize: totalInputSize,
      outputSize,
    });
  } catch (err) {
    post({ type: 'error', message: err.message || String(err) });
  }
});
