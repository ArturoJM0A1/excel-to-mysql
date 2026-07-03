import { formatValue } from './formatters';
import { INSERT_BATCH } from './constants';

/* Módulo de generación de sentencias SQL.
   Construye los comandos DROP TABLE IF EXISTS, CREATE TABLE
   e INSERT INTO a partir de los objetos tabla generados
   durante el procesamiento. */

export function generateCreateTable(table) {
  const lines = [];
  lines.push('DROP TABLE IF EXISTS `' + table.tableName + '`;');
  const cols = [];
  for (let i = 0; i < table.columns.length; i++) {
    const t = table.types[i];
    let colDef = '  `' + table.columns[i] + '` ' + t.type;
    if (t.type === 'VARCHAR' && t.length) colDef += '(' + t.length + ')';
    if (t.type === 'DECIMAL' && t.precision) {
      colDef += '(' + t.precision + ',' + (t.scale || 0) + ')';
    }
    cols.push(colDef + ' NULL');
  }
  lines.push('CREATE TABLE `' + table.tableName + '` (');
  lines.push(cols.join(',\n'));
  lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
  return lines.join('\n');
}

export function generateCreateTableIfNotExists(table) {
  const cols = [];
  for (let j = 0; j < table.columns.length; j++) {
    const t = table.types[j];
    let colDef = '  `' + table.columns[j] + '` ' + t.type;
    if (t.type === 'VARCHAR' && t.length) colDef += '(' + t.length + ')';
    if (t.type === 'DECIMAL' && t.precision) {
      colDef += '(' + t.precision + ',' + (t.scale || 0) + ')';
    }
    cols.push(colDef + ' NULL');
  }
  return 'CREATE TABLE IF NOT EXISTS `' + table.tableName + '` (\n' +
    cols.join(',\n') + '\n' +
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;';
}

export function generateInsertStatements(table) {
  const stmts = [];
  if (table.rows.length === 0) return stmts;

  const colNames = table.columns.map(n => '`' + n + '`').join(', ');
  const header = 'INSERT INTO `' + table.tableName + '` (' + colNames + ') VALUES';

  let batch = [];
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    const vals = [];
    for (let j = 0; j < table.columns.length; j++) {
      const val = (j < row.length) ? row[j] : null;
      vals.push(formatValue(val, table.types[j]));
    }
    batch.push('(' + vals.join(', ') + ')');

    if (batch.length >= INSERT_BATCH || i === table.rows.length - 1) {
      stmts.push(header + '\n' + batch.join(',\n') + ';');
      batch = [];
    }
  }

  return stmts;
}

export function generateHeaderComment(filesCount, tablesCount) {
  const now = new Date();
  const dateStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0');
  return [
    '-- =====================================================',
    '-- Generado por: Excel a MySQL Converter',
    '-- Fecha: ' + dateStr,
    '-- Archivos: ' + filesCount,
    '-- Tablas: ' + tablesCount,
    '-- =====================================================',
    '',
  ].join('\n');
}

export function buildSQL(tables, useTransaction, useDropTable) {
  const parts = [];
  parts.push(generateHeaderComment(tables.length > 0 ? 1 : 0, tables.length));

  if (useTransaction) {
    parts.push('START TRANSACTION;');
    parts.push('');
  }

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    parts.push('');
    parts.push('-- ----------------------------------------------');
    parts.push('-- Tabla: ' + table.tableName + ' (Hoja: ' + table.sheetName + ')');
    parts.push('-- Registros: ' + table.rowCount);
    parts.push('-- ----------------------------------------------');
    parts.push('');

    if (useDropTable) {
      parts.push(generateCreateTable(table));
    } else {
      parts.push(generateCreateTableIfNotExists(table));
    }
    parts.push('');

    const inserts = generateInsertStatements(table);
    for (let k = 0; k < inserts.length; k++) {
      parts.push(inserts[k]);
      parts.push('');
    }
  }

  if (useTransaction) {
    parts.push('COMMIT;');
    parts.push('');
  }

  return parts.join('\n');
}
