/* Funciones de formateo y detección de valores para generar SQL válido.
   Incluye:
   - Escapado de strings para MySQL ('', \\, caracteres de control)
   - Detección de valores booleanos y numéricos
   - Formateo de fechas en formatos compatibles con MySQL
   - Conversión de valores a representación SQL según el tipo inferido */

export function escapeSQLString(str) {
  if (str === null || str === undefined) return 'NULL';
  let s = String(str);
  s = s.replace(/\\/g, '\\\\');
  s = s.replace(/'/g, "''");
  s = s.replace(/\n/g, '\\n');
  s = s.replace(/\r/g, '\\r');
  s = s.replace(/\t/g, '\\t');
  s = s.replace(/\0/g, '\\0');
  return "'" + s + "'";
}

/* Patrones para detección de booleanos en múltiples formatos
   incluyendo español (verdadero/falso, sí/no, v/f) */
const BOOL_TRUE = /^(true|yes|sí|verdadero|v|1)$/i;
const BOOL_FALSE = /^(false|no|falso|f|0)$/i;

export function isBoolVal(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  if (BOOL_TRUE.test(s)) return true;
  if (BOOL_FALSE.test(s)) return false;
  return null;
}

export function isNumericVal(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (s.length === 0) return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function padNum(n) { return String(n).padStart(2, '0'); }

export function fmtDate(d) {
  return d.getFullYear() + '-' + padNum(d.getMonth() + 1) + '-' + padNum(d.getDate());
}

export function fmtTime(d) {
  return padNum(d.getHours()) + ':' + padNum(d.getMinutes()) + ':' + padNum(d.getSeconds());
}

export function fmtDatetime(d) {
  return fmtDate(d) + ' ' + fmtTime(d);
}

/* Convierte un valor a su representación SQL según el tipo inferido.
   Los objetos Date se formatean como strings de fecha/hora MySQL.
   Los valores numéricos se insertan sin comillas.
   Los booleanos se convierten a TRUE/FALSE.
   Los strings se escapan y envuelven en comillas simples. */
export function formatValue(val, typeInfo) {
  if (val === null || val === undefined || val === '') return 'NULL';
  const type = typeInfo.type;

  if (type === 'BOOLEAN') {
    const b = isBoolVal(val);
    if (b === true) return 'TRUE';
    if (b === false) return 'FALSE';
    return 'NULL';
  }

  if (type === 'INT' || type === 'BIGINT') {
    const n = isNumericVal(val);
    if (n !== null) return String(Math.round(n));
    const s = String(val).replace(/[^0-9\-]/g, '');
    return s || 'NULL';
  }

  if (type === 'DECIMAL' || type === 'FLOAT' || type === 'DOUBLE') {
    const n = isNumericVal(val);
    if (n !== null) return String(n);
    return 'NULL';
  }

  if (type === 'DATE') {
    if (val instanceof Date && !isNaN(val.getTime())) return "'" + fmtDate(val) + "'";
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return "'" + s + "'";
    try {
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) return "'" + fmtDate(dt) + "'";
    } catch (e) {}
    return "'" + s + "'";
  }

  if (type === 'DATETIME') {
    if (val instanceof Date && !isNaN(val.getTime())) return "'" + fmtDatetime(val) + "'";
    let s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}(:\d{2})?$/.test(s)) {
      const parts = s.split(/[\sT]/);
      let timePart = parts[1];
      if (timePart.split(':').length === 2) timePart += ':00';
      return "'" + parts[0] + ' ' + timePart + "'";
    }
    return "'" + s + "'";
  }

  if (type === 'TIME') {
    if (val instanceof Date && !isNaN(val.getTime())) return "'" + fmtTime(val) + "'";
    let s = String(val).trim();
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) {
      if (s.split(':').length === 2) s += ':00';
      return "'" + s + "'";
    }
    return "'" + s + "'";
  }

  return escapeSQLString(val);
}

/* Convierte bytes a una representación legible (B, KB, MB). */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
