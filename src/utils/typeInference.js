import { isBoolVal, isNumericVal } from './formatters';

/* Inferencia del tipo MySQL más adecuado para una columna.
   Analiza todos los valores no nulos y aplica reglas en orden:
   1. BOOLEAN si todos los valores son boolean-like
   2. DATE/DATETIME/TIME si todos son fechas
   3. INT/BIGINT/DECIMAL/FLOAT/DOUBLE si todos son numéricos
   4. VARCHAR/TEXT/MEDIUMTEXT/LONGTEXT según la longitud máxima

   Cada columna se evalúa de forma independiente, permitiendo
   que diferentes tablas usen tipos distintos para columnas
   con el mismo nombre. */
export function inferColumnType(values) {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return { type: 'VARCHAR', length: 255 };

  let allBool = true, allNum = true, allDate = true;
  let hasBool = false, hasNum = false, hasDate = false, hasStr = false;
  let maxLen = 0, maxDecimals = 0, maxIntDigits = 0, maxAbs = 0;
  const dateTypeCount = { date: 0, datetime: 0, time: 0 };

  for (let j = 0; j < nonNull.length; j++) {
    const val = nonNull[j];
    const s = String(val).trim();

    const b = isBoolVal(val);
    if (b !== null) hasBool = true; else allBool = false;

    const n = isNumericVal(val);
    if (n !== null) hasNum = true; else allNum = false;

    if (val instanceof Date && !isNaN(val.getTime())) {
      hasDate = true;
      const h = val.getHours(), mi = val.getMinutes(), sec = val.getSeconds();
      if (h === 0 && mi === 0 && sec === 0) {
        dateTypeCount.date++;
      } else if (val.getFullYear() <= 1900 && val.getMonth() <= 1 && val.getDate() <= 2) {
        dateTypeCount.time++;
      } else {
        dateTypeCount.datetime++;
      }
    } else if (typeof val === 'number' && val > 1 && val < 2958466) {
      hasDate = true;
      dateTypeCount.datetime++;
    } else {
      const isStrDate = /^\d{4}-\d{2}-\d{2}$/.test(s);
      const isStrDatetime = /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}(:\d{2})?$/.test(s);
      const isStrTime = /^\d{2}:\d{2}(:\d{2})?$/.test(s);
      if (isStrDate || isStrDatetime || isStrTime) {
        hasDate = true;
        if (isStrDatetime) dateTypeCount.datetime++;
        else if (isStrTime) dateTypeCount.time++;
        else dateTypeCount.date++;
      } else {
        allDate = false;
      }
    }

    if (typeof val === 'string') {
      hasStr = true;
      if (s.length > maxLen) maxLen = s.length;
    } else if (typeof val === 'number') {
      const parts = String(val).split('.');
      const intLen = (parts[0].charAt(0) === '-' ? parts[0].length - 1 : parts[0].length);
      if (intLen > maxIntDigits) maxIntDigits = intLen;
      const decLen = parts[1] ? parts[1].length : 0;
      if (decLen > maxDecimals) maxDecimals = decLen;
      if (Math.abs(val) > maxAbs) maxAbs = Math.abs(val);
    } else if (!(val instanceof Date)) {
      hasStr = true;
      if (s.length > maxLen) maxLen = s.length;
    }
  }

  if (allBool && hasBool && !hasNum && !hasStr && !hasDate) {
    return { type: 'BOOLEAN' };
  }

  if (allDate && hasDate && !hasBool && !hasNum && !hasStr) {
    if (dateTypeCount.datetime > 0) return { type: 'DATETIME' };
    if (dateTypeCount.time > 0 && dateTypeCount.date === 0) return { type: 'TIME' };
    return { type: 'DATE' };
  }

  if (allNum && hasNum && !hasBool && !hasDate && !hasStr) {
    if (maxDecimals === 0) {
      if (maxAbs <= 2147483647) return { type: 'INT' };
      if (maxAbs <= 9223372036854775807) return { type: 'BIGINT' };
      return { type: 'BIGINT' };
    }
    const totalDigits = maxIntDigits + maxDecimals;
    if (totalDigits > 65 || maxDecimals > 30) return { type: 'DOUBLE' };
    if (maxDecimals <= 6 && totalDigits <= 15) return { type: 'DECIMAL', precision: Math.min(totalDigits, 65), scale: Math.min(maxDecimals, 30) };
    if (totalDigits <= 24) return { type: 'FLOAT' };
    return { type: 'DOUBLE' };
  }

  if (allNum && hasNum && !hasBool && !hasDate && hasStr) {
    if (maxLen <= 65535) return { type: 'TEXT' };
    if (maxLen <= 16777215) return { type: 'MEDIUMTEXT' };
    return { type: 'LONGTEXT' };
  }

  if (maxLen <= 255) return { type: 'VARCHAR', length: Math.min(maxLen + 32, 255) };
  if (maxLen <= 65535) return { type: 'TEXT' };
  if (maxLen <= 16777215) return { type: 'MEDIUMTEXT' };
  return { type: 'LONGTEXT' };
}
