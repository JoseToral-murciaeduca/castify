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

/**
 * Lista de proxies CORS a intentar en orden si la URL directa falla.
 * Los navegadores bloquean peticiones cross-origin sin cabeceras CORS.
 * Un proxy actúa como intermediario añadiendo esas cabeceras.
 */
const CORS_PROXIES = [
  (url) => url,                                                  // 1º intento: URL directa
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,   // 2º: corsproxy.io
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, // 3º: allorigins
];

/** Timeout máximo (ms) para peticiones de red */
const FETCH_TIMEOUT_MS = 15_000;

/** Tamaño máximo de archivo local permitido (50 MB) */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Extensiones que se consideran streams de vídeo */
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.avi', '.mov', '.ts', '.m4v', '.flv']);

/** Extensiones que se consideran audio */
const AUDIO_EXTENSIONS = new Set(['.mp3', '.aac', '.ogg', '.flac', '.m4a', '.opus']);


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 2 · DETECCIÓN DE TIPO DE STREAM
───────────────────────────────────────────────────────────────── */

/**
 * Determina el tipo de stream a partir de su URL.
 *
 * @param {string} url URL del recurso multimedia
 * @returns {'hls' | 'video' | 'audio' | 'unknown'}
 *
 * Ejemplos:
 *   detectStreamType('https://…/live.m3u8') → 'hls'
 *   detectStreamType('https://…/pelicula.mp4') → 'video'
 *   detectStreamType('https://…/radio.mp3') → 'audio'
 */
function detectStreamType(url) {
  if (!url || typeof url !== 'string') return 'unknown';

  // Normalizar: eliminar query-string y hash para comparar extensión
  const cleanUrl = url.toLowerCase().split('?')[0].split('#')[0];

  // HLS: contiene .m3u8 en la ruta
  if (cleanUrl.includes('.m3u8')) return 'hls';

  // Extraer la extensión final del path
  const ext = cleanUrl.match(/(\.[a-z0-9]+)$/)?.[1] ?? '';

  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';

  // Heurísticas adicionales: palabras clave comunes en URLs de streaming
  if (/\/stream\/|\/live\/|\/hls\//i.test(url)) return 'hls';
  if (/radio|audio|podcast/i.test(url))         return 'audio';

  // Por defecto asumimos vídeo (la mayoría de streams IPTV son vídeo)
  return 'video';
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 3 · PARSER PRINCIPAL DEL FORMATO M3U
───────────────────────────────────────────────────────────────── */

/**
 * Estructura de datos que representa un canal/entrada de la lista.
 *
 * @typedef {Object} M3UChannel
 * @property {string}  id          ID único generado (canal_<índice>)
 * @property {string}  title       Nombre del canal (#EXTINF … ,Nombre)
 * @property {string}  url         URL del stream
 * @property {string}  group       Grupo/categoría (group-title="…")
 * @property {string}  logo        URL del logo (tvg-logo="…")
 * @property {string}  tvgId       ID EPG del canal (tvg-id="…")
 * @property {string}  tvgName     Nombre EPG (tvg-name="…")
 * @property {string}  language    Idioma (tvg-language="…")
 * @property {string}  country     País (tvg-country="…")
 * @property {string}  streamType  'hls' | 'video' | 'audio' | 'unknown'
 * @property {number}  duration    Duración en segundos (-1 = stream en vivo)
 * @property {number}  lineNumber  Línea del fichero donde apareció la URL
 */

/**
 * Parsea una cadena de texto con formato M3U extendido (EXTINF).
 *
 * Flujo de trabajo:
 *  ① Divide el texto en líneas
 *  ② Ignora comentarios irrelevantes y la cabecera #EXTM3U
 *  ③ Cuando encuentra #EXTINF → extrae metadatos con regex
 *  ④ La línea siguiente a #EXTINF que no empieza con '#' es la URL
 *  ⑤ Construye un objeto M3UChannel y lo añade al array de resultados
 *
 * @param {string} rawText Contenido textual del archivo M3U
 * @returns {Object} Objeto con la epgUrl global y el array de canales parseados
 */
function parseM3UText(rawText) {

  /* ── Paso 1: Sanear la entrada ──────────────────────────── */
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('El contenido de la lista está vacío o no es válido.');
  }

  // Reemplazar CRLF (Windows) → LF y dividir en líneas
  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  /* ── Paso 2: Verificar que es un archivo M3U ────────────── */
  const firstContent = lines.find(l => l.trim().length > 0) ?? '';
  const isExtended   = firstContent.trim().startsWith('#EXTM3U');

  if (!isExtended) {
    console.warn('[M3UParser] La lista no comienza con #EXTM3U. Se intentará parsear igualmente.');
  }

  /* ── Paso 3: Iterar línea a línea ───────────────────────── */
  let   globalEpgUrl = '';  // <--- MODIFICACIÓN: Capturar EPG global
  const channels     = [];
  let   currentMeta  = null;
  let   channelIdx   = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();

    // Ignorar líneas vacías
    if (!line) continue;

    /* ── Caso A: Directiva especial de la cabecera (#EXTM3U) ── */
    if (line.startsWith('#EXTM3U') || line.startsWith('#EXTM3U:')) {
      const epgMatch = line.match(/url-tvg="([^"]+)"/i) || line.match(/tvg-url="([^"]+)"/i);
      if (epgMatch) {
        globalEpgUrl = epgMatch[1];
      }
      continue;
    }

    /* ── Caso B: Línea de metadatos #EXTINF ──────────────── */
    if (line.startsWith('#EXTINF')) {
      currentMeta = extractExtinfMetadata(line);
      continue;
    }

    /* ── Caso C: Otros comentarios/directivas → ignorar ───── */
    if (line.startsWith('#')) continue;

    /* ── Caso D: URL del stream ───────────────────────────── */
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

  /* ── Paso 4: Validar que se encontró algo ───────────────── */
  if (channels.length === 0) {
    throw new Error('No se encontraron canales en la lista. Verifica que el formato sea M3U correcto.');
  }

  console.info(`[M3UParser] ✓ Parseados ${channels.length} canales. EPG Global: ${globalEpgUrl || 'Ninguna'}`);

  // Retornamos la estructura completa conservando compatibilidad
  return {
    epgUrl: globalEpgUrl,
    channels: channels
  };
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 4 · EXTRACCIÓN DE METADATOS DE #EXTINF
───────────────────────────────────────────────────────────────── */

/**
 * Extrae todos los atributos de una línea #EXTINF usando expresiones regulares.
 *
 * Formato estándar:
 *   #EXTINF:<duración> tvg-id="id" tvg-name="nombre" tvg-logo="url"
 *            group-title="grupo",<Título visible>
 *
 * @param {string} extinf La línea completa que empieza con #EXTINF
 * @returns {Object} Objeto con todos los metadatos extraídos
 */
function extractExtinfMetadata(extinf) {

  /* ── Duración ───────────────────────────────────────────── */
  const durationMatch = extinf.match(/^#EXTINF:\s*(-?\d+(?:\.\d+)?)/);
  const duration      = durationMatch ? parseFloat(durationMatch[1]) : -1;

  /* ── Título ─────────────────────────────────────────────── */
  const lastCommaIdx = extinf.lastIndexOf(',');
  const title        = lastCommaIdx >= 0
      ? extinf.slice(lastCommaIdx + 1).trim()
      : '';

  /* ── Atributos clave=valor ──────────────────────────────── */
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

/**
 * Ensambla el objeto M3UChannel definitivo combinando la URL con los metadatos.
 *
 * @param {string}      url        URL del stream
 * @param {Object|null} meta       Metadatos de #EXTINF (puede ser null)
 * @param {number}      index      Índice global del canal
 * @param {number}      lineNumber Número de línea en el fichero original
 * @returns {M3UChannel}
 */
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
    name:       safeMeta.title    || `Canal ${index + 1}`, // Alias de compatibilidad
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

/**
 * Organiza un array plano de canales en un Map agrupado por group-title.
 *
 * @param {M3UChannel[]} channels Array plano de canales
 * @returns {Map<string, M3UChannel[]>} Mapa { grupo → [canales] }
 */
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

/**
 * Descarga una lista M3U desde una URL remota.
 *
 * @param {string}   url            URL de la lista M3U
 * @param {Function} [onProgress]   Callback opcional de progreso (mensaje:string)
 * @returns {Promise<Object>} Objeto con canales y epgUrl
 * @throws {Error} si ningún proxy funciona
 */
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

/**
 * Lee un archivo M3U seleccionado por el usuario con <input type="file">
 *
 * @param {File}     file         Objeto File del input o drag-and-drop
 * @param {Function} [onProgress] Callback de progreso
 * @returns {Promise<Object>}
 * @throws {Error} si el archivo es muy grande, tiene extensión incorrecta o está corrupto
 */
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

/**
 * Filtra un array de canales por texto de búsqueda y/o grupo.
 *
 * @param {M3UChannel[]} channels  Lista completa de canales
 * @param {Object}       filters   Criterios de filtro
 * @param {string}       [filters.query]  Texto a buscar en título/grupo
 * @param {string}       [filters.group]  Filtrar por grupo exacto
 * @param {string}       [filters.type]   Filtrar por tipo: 'hls'|'video'|'audio'
 * @returns {M3UChannel[]} Canales que cumplen todos los criterios
 */
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

/**
 * Elimina acentos y diacríticos de una cadena para búsquedas más flexibles.
 *
 * @param {string} str
 * @returns {string}
 */
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