/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  CinemaStream · player/m3u-parser.js                            ║
 * ║  Parser M3U / M3U8 — JavaScript Puro (ES2020+)                  ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Responsabilidades:                                              ║
 * ║   1. Parsear el texto de una lista M3U / M3U8 en objetos JS     ║
 * ║   2. Cargar listas desde una URL remota (con fallback CORS)     ║
 * ║   3. Leer archivos locales con la File API del navegador         ║
 * ║   4. Agrupar canales por categoría (group-title)                ║
 * ║   5. Detectar tipo de stream (HLS / MP4 / audio)                ║
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
 * @param {string} url - URL del recurso multimedia
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
 * @property {string}  id          - ID único generado (canal_<índice>)
 * @property {string}  title       - Nombre del canal (#EXTINF … ,Nombre)
 * @property {string}  url         - URL del stream
 * @property {string}  group       - Grupo/categoría (group-title="…")
 * @property {string}  logo        - URL del logo (tvg-logo="…")
 * @property {string}  tvgId       - ID EPG del canal (tvg-id="…")
 * @property {string}  tvgName     - Nombre EPG (tvg-name="…")
 * @property {string}  language    - Idioma (tvg-language="…")
 * @property {string}  country     - País (tvg-country="…")
 * @property {string}  streamType  - 'hls' | 'video' | 'audio' | 'unknown'
 * @property {number}  duration    - Duración en segundos (-1 = stream en vivo)
 * @property {number}  lineNumber  - Línea del fichero donde apareció la URL
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
 * @param {string} rawText - Contenido textual del archivo M3U
 * @returns {M3UChannel[]} - Array de canales parseados
 */
function parseM3UText(rawText) {

  /* ── Paso 1: Sanear la entrada ──────────────────────────── */
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('El contenido de la lista está vacío o no es válido.');
  }

  // Reemplazar CRLF (Windows) → LF y dividir en líneas
  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  /* ── Paso 2: Verificar que es un archivo M3U ────────────── */
  // La primera línea no vacía debería ser #EXTM3U, pero no es obligatorio
  const firstContent = lines.find(l => l.trim().length > 0) ?? '';
  const isExtended   = firstContent.trim().startsWith('#EXTM3U');

  // Advertencia suave: continuar aunque no tenga cabecera estándar
  if (!isExtended) {
    console.warn('[M3UParser] La lista no comienza con #EXTM3U. Se intentará parsear igualmente.');
  }

  /* ── Paso 3: Iterar línea a línea ───────────────────────── */
  const channels   = [];    // Array de resultados final
  let   currentMeta = null; // Metadatos del canal actual (rellenados por #EXTINF)
  let   channelIdx  = 0;    // Contador para generar IDs únicos

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();

    // Ignorar líneas vacías
    if (!line) continue;

    /* ── Caso A: Línea de metadatos #EXTINF ──────────────── */
    if (line.startsWith('#EXTINF')) {
      currentMeta = extractExtinfMetadata(line);
      continue; // Pasar a la siguiente línea (que debería ser la URL)
    }

    /* ── Caso B: Directiva especial de la cabecera ────────── */
    // #EXTM3U puede tener parámetros → los extraemos para metadatos globales
    if (line.startsWith('#EXTM3U')) {
      // Podría contener url-tvg="…" con la fuente EPG, lo ignoramos por ahora
      continue;
    }

    /* ── Caso C: Otros comentarios/directivas → ignorar ───── */
    if (line.startsWith('#')) continue;

    /* ── Caso D: URL del stream ───────────────────────────── */
    // Validación básica de URL (debe contener "://" o ser una ruta relativa)
    if (!line.includes('://') && !line.startsWith('/')) {
      console.warn(`[M3UParser] Línea ${lineIdx + 1} no parece una URL válida: "${line.slice(0, 60)}…"`);
      currentMeta = null;
      continue;
    }

    // Construir el objeto de canal con los metadatos (o valores por defecto)
    const channel = buildChannel(line, currentMeta, channelIdx, lineIdx + 1);
    channels.push(channel);
    channelIdx++;

    // Resetear metadatos para el próximo canal
    currentMeta = null;
  }

  /* ── Paso 4: Validar que se encontró algo ───────────────── */
  if (channels.length === 0) {
    throw new Error('No se encontraron canales en la lista. Verifica que el formato sea M3U correcto.');
  }

  console.info(`[M3UParser] ✓ Parseados ${channels.length} canales.`);
  return channels;
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
 * @param {string} extinf - La línea completa que empieza con #EXTINF
 * @returns {Object} - Objeto con todos los metadatos extraídos
 */
function extractExtinfMetadata(extinf) {

  /* ── Duración ─────────────────────────────────────────────
     El primer número tras #EXTINF: es la duración en segundos.
     -1 indica stream en vivo (sin duración definida).
  ─────────────────────────────────────────────────────────── */
  const durationMatch = extinf.match(/^#EXTINF:\s*(-?\d+(?:\.\d+)?)/);
  const duration      = durationMatch ? parseFloat(durationMatch[1]) : -1;

  /* ── Título ───────────────────────────────────────────────
     El título está DESPUÉS de la última coma de la línea.
     Ejemplo: #EXTINF:-1 tvg-name="Canal" ,Canal HD ← aquí
  ─────────────────────────────────────────────────────────── */
  const lastCommaIdx = extinf.lastIndexOf(',');
  const title        = lastCommaIdx >= 0
    ? extinf.slice(lastCommaIdx + 1).trim()
    : '';

  /* ── Atributos clave=valor ────────────────────────────────
     Muchos atributos usan el formato: nombre="valor"
     Usamos una regex genérica que captura cualquier par.
  ─────────────────────────────────────────────────────────── */
  const attrRegex = /([\w-]+)="([^"]*)"/g;
  const attrs     = {};
  let   match;

  while ((match = attrRegex.exec(extinf)) !== null) {
    // match[1] = nombre del atributo, match[2] = valor
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
    // Atributo de radio (algunos proveedores lo marcan explícitamente)
    radio:       attrs['radio']?.toLowerCase() === 'true',
  };
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 5 · CONSTRUCCIÓN DEL OBJETO CANAL
───────────────────────────────────────────────────────────────── */

/**
 * Ensambla el objeto M3UChannel definitivo combinando la URL con los metadatos.
 *
 * @param {string}      url        - URL del stream
 * @param {Object|null} meta       - Metadatos de #EXTINF (puede ser null)
 * @param {number}      index      - Índice global del canal
 * @param {number}      lineNumber - Número de línea en el fichero original
 * @returns {M3UChannel}
 */
function buildChannel(url, meta, index, lineNumber) {

  // Si no hay metadatos (lista sin #EXTINF), usar valores mínimos
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

  // Detectar tipo de stream automáticamente
  // Si el propio metadato lo marca como radio, forzamos audio
  const rawType   = detectStreamType(url);
  const streamType = safeMeta.radio ? 'audio' : rawType;

  return {
    id:         `canal_${index}`,
    title:      safeMeta.title    || `Canal ${index + 1}`,
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
    // Flag de conveniencia: ¿es un stream en vivo?
    isLive:     safeMeta.duration === -1 || safeMeta.duration < 0,
  };
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 6 · AGRUPADOR DE CANALES
───────────────────────────────────────────────────────────────── */

/**
 * Organiza un array plano de canales en un Map agrupado por group-title.
 *
 * @param {M3UChannel[]} channels - Array plano de canales
 * @returns {Map<string, M3UChannel[]>} - Mapa { grupo → [canales] }
 *
 * Ejemplo de salida:
 *   Map {
 *     'Noticias'      → [canal1, canal2, …],
 *     'Deportes'      → [canal3, …],
 *     'Sin grupo'     → [canal5, …],
 *   }
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

  // Ordenar los grupos alfabéticamente (excepto "Sin grupo" que va al final)
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
 * Estrategia:
 *  1. Intenta descargar directamente con fetch()
 *  2. Si falla por CORS/red → prueba cada proxy de CORS_PROXIES
 *  3. Si el contenido no es M3U → lo trata como URL de stream único
 *
 * @param {string}   url            - URL de la lista M3U
 * @param {Function} [onProgress]   - Callback opcional de progreso (mensaje:string)
 * @returns {Promise<M3UChannel[]>} - Canales parseados
 * @throws {Error} si ningún proxy funciona
 */
async function loadFromUrl(url, onProgress = () => {}) {

  /* ── Validación previa de la URL ────────────────────────── */
  if (!url || !url.includes('://')) {
    throw new Error('La URL no tiene un formato válido. Debe comenzar con http:// o https://');
  }

  let lastError = null;

  /* ── Iterar sobre los proxies disponibles ───────────────── */
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxyFn    = CORS_PROXIES[i];
    const targetUrl  = proxyFn(url);
    const proxyLabel = i === 0 ? 'directo' : `proxy #${i}`;

    onProgress(`Intentando conexión ${proxyLabel}…`);

    try {
      /* ── fetch() con timeout ─────────────────────────────
         AbortSignal.timeout() cancela automáticamente si
         el servidor tarda más de FETCH_TIMEOUT_MS.
      ──────────────────────────────────────────────────── */
      const response = await fetch(targetUrl, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          // Algunos servidores requieren User-Agent para servir contenido
          'Accept': 'application/x-mpegurl, application/vnd.apple.mpegurl, */*',
        },
      });

      // HTTP 2xx → éxito
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      onProgress('Archivo descargado. Procesando…');

      /* ── ¿Es realmente un M3U? ───────────────────────────
         Verificar si contiene marcadores M3U.
         Si no, podría ser una URL de stream directo.
      ─────────────────────────────────────────────────── */
      if (text.includes('#EXTM3U') || text.includes('#EXTINF')) {
        return parseM3UText(text);
      }

      // URL apunta directamente a un stream (no a una lista)
      console.info('[M3UParser] La URL parece un stream directo, no una lista.');
      const singleStream = buildChannel(url, null, 0, 0);
      singleStream.title = 'Stream directo';
      return [singleStream];

    } catch (err) {
      lastError = err;
      console.warn(`[M3UParser] Fallo con ${proxyLabel}: ${err.message}`);
      // Continuar con el siguiente proxy
    }
  }

  /* ── Todos los intentos fallaron ────────────────────────── */
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
 * usando la File API del navegador (FileReader).
 *
 * @param {File}     file         - Objeto File del input o drag-and-drop
 * @param {Function} [onProgress] - Callback de progreso
 * @returns {Promise<M3UChannel[]>}
 * @throws {Error} si el archivo es muy grande, tiene extensión incorrecta o está corrupto
 */
function loadFromFile(file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {

    /* ── Validaciones del archivo ───────────────────────────── */
    if (!file) {
      reject(new Error('No se ha seleccionado ningún archivo.'));
      return;
    }

    // Verificar tamaño máximo
    if (file.size > MAX_FILE_SIZE_BYTES) {
      reject(new Error(`El archivo (${(file.size / 1024 / 1024).toFixed(1)} MB) supera el límite de 50 MB.`));
      return;
    }

    // Verificar extensión (flexible: acepta .m3u, .m3u8, .txt)
    const allowedExts = ['.m3u', '.m3u8', '.txt'];
    const fileName    = file.name.toLowerCase();
    const hasValidExt = allowedExts.some(ext => fileName.endsWith(ext));

    if (!hasValidExt) {
      // Advertencia no bloqueante: algunos archivos M3U no tienen extensión
      console.warn(`[M3UParser] Extensión no reconocida: ${file.name}. Se intentará parsear.`);
    }

    onProgress(`Leyendo "${file.name}" (${(file.size / 1024).toFixed(0)} KB)…`);

    /* ── Leer el archivo como texto ─────────────────────────── */
    const reader = new FileReader();

    // Evento: lectura completada con éxito
    reader.onload = (event) => {
      try {
        onProgress('Archivo leído. Procesando canales…');
        const channels = parseM3UText(event.target.result);
        resolve(channels);
      } catch (parseError) {
        reject(parseError);
      }
    };

    // Evento: error durante la lectura
    reader.onerror = () => {
      reject(new Error(`Error al leer el archivo "${file.name}". ¿El archivo está dañado?`));
    };

    // Evento: progreso de lectura (útil para archivos grandes)
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(`Leyendo archivo… ${percent}%`);
      }
    };

    /* ── Iniciar la lectura en UTF-8 ────────────────────────── */
    // La mayoría de listas M3U usan UTF-8, pero algunas usan Latin-1
    // Si hay problemas de caracteres, cambiar a 'windows-1252'
    reader.readAsText(file, 'UTF-8');
  });
}


/* ─────────────────────────────────────────────────────────────────
   SECCIÓN 9 · BÚSQUEDA / FILTRO DE CANALES
───────────────────────────────────────────────────────────────── */

/**
 * Filtra un array de canales por texto de búsqueda y/o grupo.
 *
 * @param {M3UChannel[]} channels  - Lista completa de canales
 * @param {Object}       filters   - Criterios de filtro
 * @param {string}       [filters.query]  - Texto a buscar en título/grupo
 * @param {string}       [filters.group]  - Filtrar por grupo exacto
 * @param {string}       [filters.type]   - Filtrar por tipo: 'hls'|'video'|'audio'
 * @returns {M3UChannel[]} - Canales que cumplen todos los criterios
 */
function filterChannels(channels, { query = '', group = '', type = '' } = {}) {

  // Normalizar el texto de búsqueda: minúsculas y sin acentos
  const normalizedQuery = removeDiacritics(query.toLowerCase().trim());

  return channels.filter(channel => {

    /* ── Filtro por texto ──────────────────────────────────── */
    if (normalizedQuery) {
      const searchableText = removeDiacritics(
        `${channel.title} ${channel.group} ${channel.tvgName} ${channel.country}`.toLowerCase()
      );
      if (!searchableText.includes(normalizedQuery)) return false;
    }

    /* ── Filtro por grupo ──────────────────────────────────── */
    if (group && channel.group !== group) return false;

    /* ── Filtro por tipo de stream ─────────────────────────── */
    if (type && channel.streamType !== type) return false;

    return true;
  });
}

/**
 * Elimina acentos y diacríticos de una cadena para búsquedas más flexibles.
 * "Música" → "Musica", "año" → "ano"
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

/**
 * Objeto público del módulo M3UParser.
 * Expone sólo las funciones necesarias para el resto de la aplicación.
 */
window.M3UParser = {
  /** Parsea texto M3U crudo → array de canales */
  parse:         parseM3UText,

  /** Carga lista desde URL remota (con fallback CORS) → Promise<canal[]> */
  fromUrl:       loadFromUrl,

  /** Lee un archivo local → Promise<canal[]> */
  fromFile:      loadFromFile,

  /** Agrupa canales por categoría → Map<grupo, canal[]> */
  groupBy:       groupChannelsByCategory,

  /** Filtra canales por criterios → canal[] */
  filter:        filterChannels,

  /** Detecta tipo de stream de una URL */
  detectType:    detectStreamType,
};
