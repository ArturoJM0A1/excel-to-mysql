import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { readWorkbook } from '../utils/excelReader';
import { sanitizeTableName, sanitizeColumnName } from '../utils/sanitizers';
import { inferColumnType } from '../utils/typeInference';
import { buildSQL } from '../utils/sqlGenerator';
import { formatFileSize } from '../utils/formatters';

/* Helper que cede el control al hilo principal del navegador
   para evitar bloqueos durante el procesamiento de archivos grandes.
   Retorna una promesa que se resuelve en el siguiente ciclo de eventos. */
function yieldToUI() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/* Hook personalizado que encapsula toda la lógica de negocio:
   - Gestión de archivos (agregar, eliminar)
   - Lectura de Excel con SheetJS
   - Procesamiento de hojas (sanitización, inferencia de tipos)
   - Generación de SQL
   - Descarga del archivo resultado

   Ventajas de usar un custom hook:
   - Separación clara entre lógica y presentación
   - Estado y funciones reutilizables
   - Componentes hijos más limpios y declarativos */
export default function useConverter() {
  /* --- Estado del hook ---
     files:     File objects seleccionados por el usuario
     tables:    arreglo de objetos { tableName, columns, types, rows }
     totalSheets: contador de hojas detectadas en todos los archivos
     totalRows:  suma de registros de todas las tablas
     sqlOutput:  string con el script SQL generado
     isConverting: flag que indica si hay una conversión en curso
     progress:   objeto { percent, detail } para la barra de progreso
     logs:       arreglo de entradas { time, message, type } para la consola */
  const [files, setFiles] = useState([]);
  const [tables, setTables] = useState([]);
  const [totalSheets, setTotalSheets] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [sqlOutput, setSqlOutput] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, detail: '' });
  const [logs, setLogs] = useState([]);

  /* addLog agrega una entrada a la consola.
     Usa la forma funcional de setLogs (prev => ...) para evitar
     depender del valor actual de logs en el closure (stale closure).
     useCallback con [] asegura que la referencia sea estable. */
  const addLog = useCallback((message, type) => {
    type = type || 'info';
    const now = new Date();
    const t = String(now.getHours()).padStart(2, '0') + ':' +
              String(now.getMinutes()).padStart(2, '0') + ':' +
              String(now.getSeconds()).padStart(2, '0');
    const entry = { time: t, message, type };
    setLogs(prev => [...prev, entry]);
  }, []);

  /* addFiles filtra los archivos agregados: solo acepta .xlsx/.xls
     y evita duplicados comparando nombre y tamaño. */
  const addFiles = useCallback((newFiles) => {
    setFiles(prev => {
      const existing = [...prev];
      for (let i = 0; i < newFiles.length; i++) {
        const f = newFiles[i];
        const name = f.name.toLowerCase();
        if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
          continue;
        }
        const exists = existing.some(ef => ef.name === f.name && ef.size === f.size);
        if (!exists) existing.push(f);
      }
      return existing;
    });
  }, []);

  /* removeFile elimina un archivo por índice y resetea los
     resultados de conversiones anteriores. */
  const removeFile = useCallback((index) => {
    setFiles(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setTables([]);
    setTotalSheets(0);
    setTotalRows(0);
    setSqlOutput('');
  }, []);

  /* convert es la función asíncrona principal.
     Recibe las opciones de configuración (useTransaction, useDropTable)
     y ejecuta el pipeline completo: leer Excel → procesar hojas → generar SQL.

     El uso de async/await combinado con yieldToUI() permite que el
     navegador renderice actualizaciones de progreso entre cada paso
     sin congelar la interfaz. */
  const convert = useCallback(async (useTransaction, useDropTable) => {
    if (files.length === 0) {
      addLog('No hay archivos para procesar', 'error');
      return;
    }

    setIsConverting(true);
    setSqlOutput('');
    setProgress({ percent: 0, detail: 'Iniciando...' });
    let errorCount = 0;

    /* ---- Fase 1: Lectura de archivos ---- */
    const allWorkbooks = [];
    let totalSheetsEstimate = 0;

    addLog('Leyendo ' + files.length + ' archivo(s)...', 'info');

    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi];
      try {
        setProgress({ percent: (fi / files.length) * 10, detail: 'Leyendo: ' + file.name });
        const wb = await readWorkbook(file);
        const sheetNames = wb.SheetNames || [];
        addLog('Archivo cargado: ' + file.name + ' (' + sheetNames.length + ' hojas)', 'success');
        allWorkbooks.push({ workbook: wb, fileName: file.name });
        totalSheetsEstimate += sheetNames.length;
      } catch (err) {
        errorCount++;
        addLog('Error al leer "' + file.name + '": ' + err.message, 'error');
      }
      await yieldToUI();
    }

    setTotalSheets(totalSheetsEstimate);

    if (allWorkbooks.length === 0) {
      addLog('No se pudo leer ning&uacute;n archivo', 'error');
      setIsConverting(false);
      setProgress({ percent: 0, detail: '' });
      return;
    }

    /* ---- Fase 2: Procesamiento de hojas ---- */
    const usedTableNames = [];
    let sheetsProcessed = 0;
    let totalSteps = 0;
    const newTables = [];

    for (let wi = 0; wi < allWorkbooks.length; wi++) {
      totalSteps += (allWorkbooks[wi].workbook.SheetNames || []).length;
    }

    if (totalSteps === 0) {
      addLog('No se encontraron hojas en los archivos', 'error');
      setIsConverting(false);
      setProgress({ percent: 0, detail: '' });
      return;
    }

    for (let wi2 = 0; wi2 < allWorkbooks.length; wi2++) {
      const wbData = allWorkbooks[wi2];
      const sheets = wbData.workbook.SheetNames || [];

      for (let si = 0; si < sheets.length; si++) {
        const sheetName = sheets[si];
        try {
          const table = processSheetData(wbData.workbook, sheetName, usedTableNames);
          if (table) {
            newTables.push(table);
          }
        } catch (err) {
          errorCount++;
          addLog('Error al procesar hoja "' + sheetName + '": ' + err.message, 'error');
        }

        sheetsProcessed++;
        const pct = 10 + (sheetsProcessed / totalSteps) * 85;
        setProgress({ percent: pct, detail: 'Procesando ' + sheetsProcessed + '/' + totalSteps + ' hojas...' });
        await yieldToUI();
      }
    }

    /* ---- Fase 3: Generación de SQL ---- */
    const rowCount = newTables.reduce((sum, t) => sum + t.rowCount, 0);
    setTables(newTables);
    setTotalRows(rowCount);

    setProgress({ percent: 95, detail: 'Generando SQL...' });
    await yieldToUI();

    const sql = buildSQL(newTables, useTransaction, useDropTable);
    const sqlSize = new Blob([sql]).size;
    addLog('SQL generado: ' + formatFileSize(sqlSize) + ', ' + newTables.length + ' tablas, ' + rowCount + ' registros', 'success');

    if (errorCount > 0) {
      addLog(errorCount + ' error(es) durante la conversi&oacute;n. Revisa la consola.', 'warning');
    }

    setSqlOutput(sql);
    setProgress({ percent: 100, detail: 'Completado' });
    setIsConverting(false);
    addLog('Conversi&oacute;n finalizada. Descarga el archivo SQL.', 'success');
  }, [files, addLog]);

  /* downloadSQL crea un Blob con el SQL generado y lo descarga
     mediante un <a> temporal. Revoca la URL tras 10 segundos
     para liberar memoria. */
  const downloadSQL = useCallback((filename) => {
    if (!sqlOutput) return;
    try {
      const blob = new Blob([sqlOutput], { type: 'application/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      addLog('Archivo descargado: ' + filename, 'success');
    } catch (err) {
      addLog('Error al descargar: ' + err.message, 'error');
    }
  }, [sqlOutput, addLog]);

  /* El hook retorna estado y funciones para que App.jsx
     los distribuya a los componentes hijos. */
  return {
    files, addFiles, removeFile,
    tables, totalSheets, totalRows,
    sqlOutput, isConverting, progress, logs,
    convert, downloadSQL,
  };
}

/* Función auxiliar (fuera del hook) que procesa una hoja individual.
   Separarla del hook mantiene la lógica de negocio pura:
   recibe datos, los transforma y retorna un objeto tabla.

   Parámetros:
   - wb: workbook de SheetJS
   - sheetName: nombre de la hoja a procesar
   - usedTableNames: arreglo compartido para detectar nombres duplicados

   Flujo:
   1. Extrae datos con sheet_to_json (header:1 = arreglo de arreglos)
   2. Sanitiza el nombre de tabla y nombres de columnas
   3. Recolecta todos los valores por columna para inferir tipos
   4. Retorna objeto { tableName, columns, types, rows, rowCount } */
function processSheetData(wb, sheetName, usedTableNames) {
  const ws = wb.Sheets[sheetName];
  if (!ws || !ws['!ref']) return null;

  let rawData;
  try {
    /* cellDates: true convierte fechas de Excel a objetos Date
       header: 1 retorna arreglo de arreglos (sin objetos)
       defval: null rellena celdas vacías con null */
    rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, cellDates: true });
  } catch (e) {
    throw new Error('Error al leer hoja: ' + e.message);
  }

  if (!rawData || rawData.length === 0) return null;

  /* Sanitizar nombre de tabla a partir del nombre de la hoja */
  const tableName = sanitizeTableName(sheetName, usedTableNames);
  usedTableNames.push(tableName);

  /* La primera fila del arreglo son los encabezados (columnas) */
  const headerRow = rawData[0] || [];
  const colNames = [];
  const colUsed = [];

  for (let c = 0; c < headerRow.length; c++) {
    const cname = sanitizeColumnName(headerRow[c], colUsed);
    colUsed.push(cname);
    colNames.push(cname);
  }

  if (colNames.length === 0) return null;

  /* Las filas restantes son datos */
  const dataRows = rawData.slice(1);
  const rowCount = dataRows.length;

  /* Recolectar valores por columna para la inferencia de tipos */
  const colValues = [];
  for (let ci = 0; ci < colNames.length; ci++) {
    colValues[ci] = [];
  }

  for (let ri = 0; ri < dataRows.length; ri++) {
    const row = dataRows[ri];
    if (!row || row.length === 0) continue;
    for (let cj = 0; cj < colNames.length; cj++) {
      colValues[cj].push(row[cj] !== undefined ? row[cj] : null);
    }
  }

  /* Inferir tipo MySQL para cada columna */
  const colTypes = colValues.map(vals => inferColumnType(vals));

  /* Filtrar filas vacías para los INSERT */
  const filteredRows = dataRows.filter(r => r && r.length > 0);

  return {
    tableName,
    sheetName,
    columns: colNames,
    types: colTypes,
    rows: filteredRows,
    rowCount,
  };
}
