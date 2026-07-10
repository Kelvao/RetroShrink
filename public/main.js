const dropZone    = document.getElementById('dropZone');
const fileInput   = document.getElementById('fileInput');
const fileInfo    = document.getElementById('fileInfo');
const fileName    = document.getElementById('fileName');
const fileSize    = document.getElementById('fileSize');
const btnClear    = document.getElementById('btnClear');
const btnConvert  = document.getElementById('btnConvert');
const mediaType   = document.getElementById('mediaType');
const compression = document.getElementById('compression');
const dropHint    = document.getElementById('dropHint');

const progressCard  = document.getElementById('progressCard');
const progressLabel = document.getElementById('progressLabel');
const progressPct   = document.getElementById('progressPct');
const progressFill  = document.getElementById('progressFill');
const log           = document.getElementById('log');

const resultCard  = document.getElementById('resultCard');
const resultName  = document.getElementById('resultName');
const resultMeta  = document.getElementById('resultMeta');
const btnDownload = document.getElementById('btnDownload');

let selectedFiles = [];
let worker = null;

function pickIndexFile(files) {
  for (const ext of ['.cue', '.gdi']) {
    const found = files.find(f => f.name.toLowerCase().endsWith(ext));
    if (found) return found;
  }
  return files[0];
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function setFile(files) {
  selectedFiles = Array.from(files);
  
  if (selectedFiles.length === 0) {
    clearFile();
    return;
  }

  const indexFile = pickIndexFile(selectedFiles);
  fileName.textContent = indexFile.name;
  fileSize.textContent = formatBytes(selectedFiles.reduce((sum, f) => sum + f.size, 0));

  if (selectedFiles.length > 1) {
    fileName.textContent += ` (+${selectedFiles.length - 1})`;
  }
  
  fileInfo.classList.add('visible');
  btnConvert.disabled = false;
  guessMediaFromFile(indexFile);
}

function clearFile() {
  selectedFiles = [];
  fileInput.value = '';
  fileInfo.classList.remove('visible');
  btnConvert.disabled = true;
  resultCard.classList.remove('visible');
}

function appendLog(message, type = '') {
  const line = document.createElement('div');
  line.className = `log-line${type ? ' ' + type : ''}`;
  line.textContent = message;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function setProgress(pct, label) {
  progressFill.style.width = `${pct}%`;
  progressPct.textContent  = `${Math.round(pct)}%`;
  if (label) progressLabel.textContent = label;
}

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) setFile(fileInput.files);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = e.dataTransfer.files;
  if (files.length > 0) setFile(files);
});

btnClear.addEventListener('click', clearFile);

btnConvert.addEventListener('click', () => {
  if (selectedFiles.length === 0) return;
  startConversion();
});

function startConversion() {
  if (worker) worker.terminate();

  const indexFile = pickIndexFile(selectedFiles);

  log.innerHTML = '';
  progressCard.classList.add('visible');
  resultCard.classList.remove('visible');
  btnConvert.disabled = true;
  setProgress(0, 'Carregando chdman...');

  worker = new Worker('worker.js', { type: 'module' });

  worker.postMessage({
    type: 'convert',
    files: selectedFiles,
    indexFileName: indexFile.name,
    mediaType: mediaType.value,
    compression: compression.value,
    outputName: indexFile.name.replace(/\.[^.]+$/, '') + '.chd',
  });

  worker.addEventListener('message', (e) => {
    const msg = e.data;
    switch (msg.type) {
      case 'progress':
        setProgress(msg.pct, msg.label);
        break;
      case 'log':
        appendLog(msg.text, msg.level);
        break;
      case 'done':
        setProgress(100, 'Concluído');
        showResult(msg);
        btnConvert.disabled = false;
        worker.terminate();
        worker = null;
        break;
      case 'error':
        appendLog(`Erro: ${msg.message}`, 'err');
        progressLabel.textContent = 'Falhou';
        btnConvert.disabled = false;
        worker.terminate();
        worker = null;
        break;
    }
  });

  worker.addEventListener('error', (e) => {
    appendLog(`Worker crash: ${e.message}`, 'err');
    btnConvert.disabled = false;
  });
}

function showResult(msg) {
  const ratio = msg.inputSize > 0
    ? ((1 - msg.outputSize / msg.inputSize) * 100).toFixed(1)
    : 0;

  resultName.textContent = msg.outputName;
  resultMeta.innerHTML =
    `${formatBytes(msg.inputSize)} → <strong>${formatBytes(msg.outputSize)}</strong> ` +
    `(${ratio}% menor)`;

  resultCard.classList.add('visible');

  btnDownload.onclick = async () => {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(msg.outputName);
      const file = await fileHandle.getFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = msg.outputName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      appendLog('Erro ao ler arquivo do OPFS para download.', 'err');
    }
  };
}
