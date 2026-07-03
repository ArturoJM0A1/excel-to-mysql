import { RESERVED } from './constants';

/* Funciones de sanitización para nombres de tablas y columnas.
   Garantizan que los identificadores SQL sean válidos:
   - Eliminan caracteres especiales y acentos
   - Reemplazan espacios por guiones bajos
   - Evitan palabras reservadas de MySQL
   - Resuelven nombres duplicados con sufijos numéricos */

export function sanitizeTableName(raw, usedNames) {
  let s = String(raw).trim();
  if (!s) s = 'tabla';
  s = s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
  s = s.replace(/[^a-zA-Z0-9_$]/g, '_');
  s = s.replace(/^[0-9_]+/, '');
  s = s.toLowerCase();
  if (!s || s.length === 0) s = 'tabla';
  if (RESERVED.indexOf(s.toUpperCase()) !== -1) s = 't_' + s;
  const base = s;
  let counter = 2;
  while (usedNames.indexOf(s) !== -1) {
    s = base + '_' + counter;
    counter++;
  }
  return s;
}

export function sanitizeColumnName(raw, usedNames) {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    let idx = usedNames.length + 1;
    let s = 'columna_' + idx;
    while (usedNames.indexOf(s) !== -1) { idx++; s = 'columna_' + idx; }
    return s;
  }
  let s = String(raw).trim();
  s = s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
  s = s.replace(/[^a-zA-Z0-9_$]/g, '_');
  s = s.replace(/^[0-9_]+/, '');
  s = s.toLowerCase();
  if (!s || s.length === 0) {
    let idx = usedNames.length + 1;
    s = 'columna_' + idx;
    while (usedNames.indexOf(s) !== -1) { idx++; s = 'columna_' + idx; }
    return s;
  }
  if (RESERVED.indexOf(s.toUpperCase()) !== -1) s = 'c_' + s;
  const base = s;
  let counter = 2;
  while (usedNames.indexOf(s) !== -1) {
    s = base + '_' + counter;
    counter++;
  }
  return s;
}
