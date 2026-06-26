# RetroShrink

RetroShrink é uma interface web para converter ROMs em imagens CHD diretamente no navegador usando o `chdman` compilado para WebAssembly.

## O que é

Uma aplicação estática que permite:
- carregar um arquivo de ROM local
- escolher tipo de mídia (CD, DVD, GDI, HD/RAW)
- selecionar compressão (`cdlz`, `zstd`, `zlib`, `cdzl`, `cdfl`, `none`)
- converter diretamente no navegador sem upload para servidores
- salvar o resultado localmente via OPFS/download

## Estrutura do repositório

- `frontend/public/`
  - `index.html` - interface principal do app
  - `main.js` - lógica do frontend e comunicação com o worker
  - `worker.js` - worker que executa o `chdman` WebAssembly
  - `_headers` - configuração de cabeçalhos para deploy estático
- `.github/workflows/build-wasm.yml` - pipeline para compilar `chdman` para WASM

## Como usar

O app é estático e deve ser servido via HTTP para que o `Worker` e os recursos funcionem corretamente.

1. Sirva `frontend/public/` com um servidor HTTP simples.
2. Abra o navegador em `http://localhost:PORT`.
3. Arraste ou selecione uma ROM.
4. Clique em `Converter para CHD`.
5. Baixe o CHD gerado.

### Exemplo rápido com Python

```bash
cd frontend/public
python3 -m http.server 8000
```

Acesse em `http://localhost:8000`.

## Build do WASM

O arquivo `chdman.wasm` não está versionado diretamente neste repositório, mas a compilação está configurada em:

- `.github/workflows/build-wasm.yml`

Esse workflow faz checkout do MAME, instala dependências, configura o Emscripten e gera o binário WebAssembly `chdman.js` / `chdman.wasm`.

## Notas importantes

- A conversão é feita localmente no navegador, sem upload de arquivos.
- O app usa o armazenamento local do navegador (OPFS) para gravar o CHD antes do download.
- Por ser um frontend estático, pode ser hospedado em serviços como Netlify, Vercel ou GitHub Pages desde que o arquivo WASM seja servido corretamente.

## Contato

Use este repositório como base para melhorar a experiência de conversão de ROMs via WebAssembly.
