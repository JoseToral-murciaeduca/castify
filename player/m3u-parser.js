/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  Castify · player/m3u-parser.js                                  ║
 * ║  Parser M3U / M3U8 — JavaScript Puro (ES2020+)                   ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Responsabilidades:                                              ║
 * ║   1. Parsear el texto de una lista M3U / M3U8 en objetos JS      ║
 * ║   2. Cargar listas desde una URL remota (con fallback CORS)      ║
 * ║   3. Leer archivos locales con la File API del navegador         ║
 * ║   4. Agrupar canales por categoría (group-title)                 ║
 * ║   5. Detectar tipo de stream (HLS / MP4 / audio)                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 1 · CONSTANTES DE CONFIGURACIÓN
───────────────────────────────────────────────────────────────── */

const CORS_PROXIES = [
  (url) => url,                                                  // 1º intento: URL directa
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,   // 2º: corsproxy.io
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, // 3º: allorigins
];

const FETCH_TIMEOUT_MS = 15_000;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.avi', '.mov', '.ts', '.m4v', '.flv']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.aac', '.ogg', '.flac', '.m4a', '.opus']);


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 2 · DETECCIÓN DE TIPO DE STREAM
───────────────────────────────────────────────────────────────── */

function detectStreamType(url) {
  if (!url || typeof url !== 'string') return 'unknown';

  const cleanUrl = url.toLowerCase().split('?')[0].split('#')[0];

  if (cleanUrl.includes('.m3u8')) return 'hls';

  const ext = cleanUrl.match(/(\.[a-z0-9]+)$/)?.[1] ?? '';

  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';

  if (/\/stream\/|\/live\/|\/hls\//i.test(url)) return 'hls';
  if (/radio|audio|podcast/i.test(url))         return 'audio';

  return 'video';
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 3 · PARSER PRINCIPAL DEL FORMATO M3U
───────────────────────────────────────────────────────────────── */

function parseM3UText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('El contenido de la lista está vacío o no es válido.');
  }

  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const firstContent = lines.find(l => l.trim().length > 0) ?? '';
  const isExtended   = firstContent.trim().startsWith('#EXTM3U');

  if (!isExtended) {
    console.warn('[M3UParser] La lista no comienza con #EXTM3U. Se intentará parsear igualmente.');
  }

  let   globalEpgUrl = '';  // Capturar EPG global
  const channels     = [];
  let   currentMeta  = null;
  let   channelIdx   = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();

    if (!line) continue;

    if (line.startsWith('#EXTM3U') || line.startsWith('#EXTM3U:')) {
      const epgMatch = line.match(/url-tvg="([^"]+)"/i) || line.match(/tvg-url="([^"]+)"/i);
      if (epgMatch) {
        globalEpgUrl = epgMatch[1];
      }
      continue;
    }

    if (line.startsWith('#EXTINF')) {
      currentMeta = extractExtinfMetadata(line);
      continue;
    }

    if (line.startsWith('#')) continue;

    if (!line.includes('://') && !line.startsWith('/')) {
      console.warn(`[M3UParser] Línea ${lineIdx + 1} no parece una URL válida: "${line.slice(0, 60)}…"`);
      currentMeta = null;
      continue;
    }

    const channel = buildChannel(line, currentMeta, channelIdx, lineIdx + 1);
    channels.push(channel);
    channelIdx++;

    currentMeta = null;
  }

  if (channels.length === 0) {
    throw new Error('No se encontraron canales en la lista. Verifica que el formato sea M3U correcto.');
  }

  console.info(`[M3UParser] ✓ Parseados ${channels.length} canales. EPG Global: ${globalEpgUrl || 'Ninguna'}`);

  return {
    epgUrl: globalEpgUrl,
    channels: channels
  };
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 4 · EXTRACCIÓN DE METADATOS DE #EXTINF
───────────────────────────────────────────────────────────────── */

function extractExtinfMetadata(extinf) {
  const durationMatch = extinf.match(/^#EXTINF:\s*(-?\d+(?:\.\d+)?)/);
  const duration      = durationMatch ? parseFloat(durationMatch[1]) : -1;

  const lastCommaIdx = extinf.lastIndexOf(',');
  const title        = lastCommaIdx >= 0
      ? extinf.slice(lastCommaIdx + 1).trim()
      : '';

  const attrRegex = /([\w-]+)="([^"]*)"/g;
  const attrs     = {};
  let   match;

  while ((match = attrRegex.exec(extinf)) !== null) {
    attrs[match[1].toLowerCase()] = match[2];
  }

  return {
    duration,
    title:       title || attrs['tvg-name'] || attrs['tvg-id'] || 'Canal sin nombre',
    tvgId:       attrs['tvg-id']       ?? '',
    tvgName:     attrs['tvg-name']     ?? '',
    logo:        attrs['tvg-logo']     ?? attrs['logo'] ?? '',
    group:       attrs['group-title']  ?? attrs['group'] ?? 'Sin grupo',
    language:    attrs['tvg-language'] ?? '',
    country:     attrs['tvg-country']  ?? '',
    radio:       attrs['radio']?.toLowerCase() === 'true',
  };
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 5 · CONSTRUCCIÓN DEL OBJETO CANAL
───────────────────────────────────────────────────────────────── */

function buildChannel(url, meta, index, lineNumber) {
  const safeMeta = meta ?? {
    title:    `Canal ${index + 1}`,
    group:    'Sin grupo',
    logo:     '',
    tvgId:    '',
    tvgName:  '',
    language: '',
    country:  '',
    duration: -1,
    radio:    false,
  };

  const rawType    = detectStreamType(url);
  const streamType = safeMeta.radio ? 'audio' : rawType;

  return {
    id:         `canal_${index}`,
    title:      safeMeta.title    || `Canal ${index + 1}`,
    name:       safeMeta.title    || `Canal ${index + 1}`,
    url:        url.trim(),
    group:      safeMeta.group    || 'Sin grupo',
    logo:       safeMeta.logo     || '',
    tvgId:      safeMeta.tvgId    || '',
    tvgName:    safeMeta.tvgName  || '',
    language:   safeMeta.language || '',
    country:    safeMeta.country  || '',
    streamType,
    duration:   safeMeta.duration ?? -1,
    lineNumber,
    isLive:     safeMeta.duration === -1 || safeMeta.duration < 0,
  };
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 6 · AGRUPADOR DE CANALES
───────────────────────────────────────────────────────────────── */

function groupChannelsByCategory(channels) {
  const groups = new Map();

  for (const channel of channels) {
    const key = channel.group || 'Sin grupo';

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(channel);
  }

  const sorted = new Map(
      [...groups.entries()].sort(([a], [b]) => {
        if (a === 'Sin grupo') return 1;
        if (b === 'Sin grupo') return -1;
        return a.localeCompare(b, 'es');
      })
  );

  return sorted;
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 7 · CARGA DESDE URL REMOTA (con fallback CORS)
───────────────────────────────────────────────────────────────── */

async function loadFromUrl(url, onProgress = () => {}) {
  if (!url || !url.includes('://')) {
    throw new Error('La URL no tiene un formato válido. Debe comenzar con http:// o https://');
  }

  let lastError = null;

  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxyFn    = CORS_PROXIES[i];
    const targetUrl  = proxyFn(url);
    const proxyLabel = i === 0 ? 'directo' : `proxy #${i}`;

    onProgress(`Intentando conexión ${proxyLabel}…`);

    try {
      const response = await fetch(targetUrl, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          'Accept': 'application/x-mpegurl, application/vnd.apple.mpegurl, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      onProgress('Archivo descargado. Procesando…');

      if (text.includes('#EXTM3U') || text.includes('#EXTINF')) {
        return parseM3UText(text);
      }

      console.info('[M3UParser] La URL parece un stream directo, no una lista.');
      const singleStream = buildChannel(url, null, 0, 0);
      singleStream.title = 'Stream directo';
      return { epgUrl: '', channels: [singleStream] };

    } catch (err) {
      lastError = err;
      console.warn(`[M3UParser] Fallo con ${proxyLabel}: ${err.message}`);
    }
  }

  throw new Error(
      `No se pudo cargar la lista. Último error: ${lastError?.message ?? 'Desconocido'}. ` +
      'Verifica la URL y asegúrate de que el servidor permite acceso externo.'
  );
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 8 · CARGA DESDE ARCHIVO LOCAL (File API)
───────────────────────────────────────────────────────────────── */

function loadFromFile(file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se ha seleccionado ningún archivo.'));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      reject(new Error(`El archivo (${(file.size / 1024 / 1024).toFixed(1)} MB) supera el límite de 50 MB.`));
      return;
    }

    const allowedExts = ['.m3u', '.m3u8', '.txt'];
    const fileName    = file.name.toLowerCase();
    const hasValidExt = allowedExts.some(ext => fileName.endsWith(ext));

    if (!hasValidExt) {
      console.warn(`[M3UParser] Extensión no reconocida: ${file.name}. Se intentará parsear.`);
    }

    onProgress(`Leyendo "${file.name}" (${(file.size / 1024).toFixed(0)} KB)…`);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        onProgress('Archivo leído. Procesando canales y EPG…');
        const resultado = parseM3UText(event.target.result);
        resolve(resultado);
      } catch (parseError) {
        reject(parseError);
      }
    };

    reader.onerror = () => {
      reject(new Error(`Error al leer el archivo "${file.name}". ¿El archivo está dañado?`));
    };

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(`Leyendo archivo… ${percent}%`);
      }
    };

    reader.readAsText(file, 'UTF-8');
  });
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 9 · BÚSQUEDA / FILTRO DE CANALES
───────────────────────────────────────────────────────────────── */

function filterChannels(channels, { query = '', group = '', type = '' } = {}) {
  const normalizedQuery = removeDiacritics(query.toLowerCase().trim());

  return channels.filter(channel => {
    if (normalizedQuery) {
      const searchableText = removeDiacritics(
          `${channel.title} ${channel.group} ${channel.tvgName} ${channel.country}`.toLowerCase()
      );
      if (!searchableText.includes(normalizedQuery)) return false;
    }

    if (group && channel.group !== group) return false;
    if (type && channel.streamType !== type) return false;

    return true;
  });
}

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 10 · EXPORTACIÓN PÚBLICA
───────────────────────────────────────────────────────────────── */

window.M3UParser = {
  parse:         parseM3UText,
  fromUrl:       loadFromUrl,
  fromFile:      loadFromFile,
  groupBy:       groupChannelsByCategory,
  filter:        filterChannels,
  detectType:    detectStreamType,
};