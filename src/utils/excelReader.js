import * as XLSX from 'xlsx';

/* Lee un archivo Excel usando FileReader y SheetJS.
   Retorna una promesa que resuelve con el workbook de SheetJS.
   El workbook contiene todas las hojas, celdas y metadatos.

   cellDates: true permite que SheetJS convierta fechas de Excel
   a objetos Date de JavaScript automáticamente. */
export function readWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true, cellNF: false, cellText: false });
        resolve(wb);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}
