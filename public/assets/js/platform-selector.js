const select = document.getElementById("platform");

const placeholder = document.createElement("option");
placeholder.value = "";
placeholder.textContent = "Selecione a Plataforma";
placeholder.disabled = true;
placeholder.selected = true;
select.appendChild(placeholder);

const groups = {};
const groupOrder = ["Sony", "Sega", "Nintendo", "Others"];

groupOrder.forEach(group => {
    groups[group] = [];
});

for (const platform of PLATFORMS) {
    if (!groups[platform.group]) {
        groups[platform.group] = [];
    }
    groups[platform.group].push(platform);
}

for (const groupName of groupOrder) {
    if (groups[groupName] && groups[groupName].length > 0) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = groupName;

        for (const platform of groups[groupName]) {
            const option = document.createElement("option");
            option.value = platform.value;
            option.textContent = platform.name;
            optgroup.appendChild(option);
        }

        select.appendChild(optgroup);
    }
}

const platformMap = {};
PLATFORMS.forEach(p => {
  platformMap[p.value] = p;
});

const COMPRESSION_DEFAULTS = {
  cd:  'cdlz',
  dvd: 'zlib',
  gdi: 'cdlz',
  hd:  'zstd',
};

function selectPlatform(platformValue) {
  const platform = platformMap[platformValue];
  if (!platform) return;

  const media = platform.media;
  const exts = platform.extensions;

  const mediaType = document.getElementById('mediaType');
  const compression = document.getElementById('compression');
  const fileInput = document.getElementById('fileInput');
  const dropHint = document.getElementById('dropHint');

  mediaType.value = media === 'gdi' ? 'cd' : media;
  compression.value = COMPRESSION_DEFAULTS[media] || 'cdlz';
  fileInput.accept = exts;
  
  const extList = exts.split(',').map(e => e.trim());
  if (extList.length === 2) {
    dropHint.textContent = extList.join(' + ');
  } else if (extList.length > 2) {
    dropHint.textContent = extList.join(', ');
  } else {
    dropHint.textContent = extList[0];
  }
}

function guessMediaFromFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  for (const platform of PLATFORMS) {
    if (platform.extensions.split(',').some(e => e.trim() === ext)) {
      selectPlatform(platform.value);
      select.value = platform.value;
      return;
    }
  }
}

select.addEventListener('change', () => {
  if (select.value) {
    selectPlatform(select.value);
  }
});

if (PLATFORMS.length > 0) {
  selectPlatform(PLATFORMS[0].value);
}