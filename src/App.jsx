import { useState, useCallback } from 'react';
import useConverter from './hooks/useConverter';
import ErrorToast from './components/ErrorToast';
import FileUpload from './components/FileUpload';
import StatsPanel from './components/StatsPanel';
import ActionsPanel from './components/ActionsPanel';
import ProgressBar from './components/ProgressBar';
import Console from './components/Console';

/* Componente raíz que orquesta toda la aplicación.
   Flujo de datos:
   1. useConverter() provee estado y lógica de negocio (custom hook).
   2. useState local maneja opciones de configuración (transacción,
      drop table, nombre de archivo) y notificaciones de error.
   3. Los valores se pasan como props descendentes a los componentes
      hijos; los callbacks permiten que los hijos notifiquen cambios
      hacia arriba.

   Separación de responsabilidades:
   - useConverter: toda la lógica de conversión Excel → SQL
   - Componentes hijos: solo presentación y eventos de UI
   - App: puente entre la lógica y la interfaz */
export default function App() {
  /* Hook personalizado que centraliza el estado de la conversión:
     archivos cargados, tablas generadas, progreso, logs, etc. */
  const {
    files, addFiles, removeFile,
    tables, totalSheets, totalRows,
    sqlOutput, isConverting, progress, logs,
    convert, downloadSQL,
  } = useConverter();

  /* Estado local de opciones de configuración.
     useTransaction y useDropTable controlan checkboxes.
     fileName almacena el nombre del archivo a descargar.
     errorToast maneja la notificación flotante de errores. */
  const [useTransaction, setUseTransaction] = useState(true);
  const [useDropTable, setUseDropTable] = useState(true);
  const [fileName, setFileName] = useState('resultado.sql');
  const [errorToast, setErrorToast] = useState({ visible: false, title: '', message: '' });

  /* Valores derivados (derived state): se calculan en cada render
     a partir del estado existente, sin necesidad de useState. */
  const showConsole = logs.length > 0 || files.length > 0;
  const hasSql = sqlOutput.length > 0;

  /* useCallback evita que estas funciones se creen en cada render
     si sus dependencias no cambian, optimizando la memoización
     cuando se pasan como props a hijos. */
  const handleConvert = useCallback(() => {
    if (files.length === 0) {
      setErrorToast({ visible: true, title: 'Sin archivos', message: 'Selecciona al menos un archivo Excel antes de convertir.' });
      return;
    }
    convert(useTransaction, useDropTable);
  }, [files, convert, useTransaction, useDropTable]);

  const handleDownload = useCallback(() => {
    if (!sqlOutput) {
      setErrorToast({ visible: true, title: 'Sin datos', message: 'No hay SQL generado. Convierte antes de descargar.' });
      return;
    }
    const name = fileName.trim() || 'resultado.sql';
    downloadSQL(name.endsWith('.sql') ? name : name + '.sql');
  }, [sqlOutput, fileName, downloadSQL]);

  const closeErrorToast = useCallback(() => {
    setErrorToast(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className="app">
      {/* Notificación de error flotante, se muestra/oculta vía errorToast */}
      <ErrorToast
        title={errorToast.title}
        message={errorToast.message}
        visible={errorToast.visible}
        onClose={closeErrorToast}
      />

      <div className="app-header">
        <h1>Excel a MySQL</h1>
        <p>Convierte archivos Excel a script SQL compatible con MySQL</p>
      </div>

      {/* Flujo de props descendentes: App pasa datos del hook a los hijos
          y los hijos notifican cambios mediante callbacks. */}
      <FileUpload
        files={files}
        onAddFiles={addFiles}
        onRemoveFile={removeFile}
      />

      <StatsPanel
        files={files}
        totalSheets={totalSheets}
        tables={tables}
        totalRows={totalRows}
      />

      <ActionsPanel
        isConverting={isConverting}
        hasSql={hasSql}
        useTransaction={useTransaction}
        setUseTransaction={setUseTransaction}
        useDropTable={useDropTable}
        setUseDropTable={setUseDropTable}
        fileName={fileName}
        setFileName={setFileName}
        onConvert={handleConvert}
        onDownload={handleDownload}
      />

      <ProgressBar progress={progress} visible={isConverting || progress.percent > 0} />

      <Console logs={logs} visible={showConsole} />

      <footer className="app-footer">
        <a href="https://arturojuarezmonroy.vercel.app/" target="_blank" rel="noopener noreferrer">
          <i className="fa-solid fa-user"></i> Portafolio
        </a>
      </footer>
    </div>
  );
}
