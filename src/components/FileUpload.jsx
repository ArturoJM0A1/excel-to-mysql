import { useState, useCallback, useRef } from 'react';
import { formatFileSize } from '../utils/formatters';

/* Componente de carga de archivos con doble modalidad:
   selector de archivos nativo y drag & drop.

   useState(isDragover) controla el estilo visual cuando
   el usuario arrastra un archivo sobre la zona de carga.
   useRef(inputRef) mantiene una referencia al <input> oculto
   para disparar su clic programáticamente (handleZoneClick).

   Eventos React:
   - onChange: dispara onAddFiles cuando se seleccionan archivos
   - onDragOver / onDragLeave: alternan isDragover para feedback visual
   - onDrop: captura los archivos soltados y llama a onAddFiles
   - onClick: abre el selector de archivos nativo

   Props:
   - files: arreglo de File objects (desde el hook)
   - onAddFiles: callback para agregar archivos al estado
   - onRemoveFile: callback para eliminar un archivo por índice */
export default function FileUpload({ files, onAddFiles, onRemoveFile }) {
  const [isDragover, setIsDragover] = useState(false);
  const inputRef = useRef(null);

  const handleChange = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      e.target.value = '';
    }
  }, [onAddFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragover(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragover(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragover(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  }, [onAddFiles]);

  const handleZoneClick = useCallback(() => {
    inputRef.current && inputRef.current.click();
  }, []);

  return (
    <div className="card">
      <div className="card-title">Archivos Excel</div>
      <div
        className={'upload-area' + (isDragover ? ' dragover' : '')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleZoneClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <span className="upload-icon">+</span>
        <span className="upload-text">Seleccionar archivos o arrastrarlos aqu&iacute;</span>
        <span className="upload-subtext">Formatos: .xlsx, .xls</span>
      </div>
      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => (
            <div key={i} className="file-item">
              <span className="file-name">{f.name}</span>
              <span className="file-size">{formatFileSize(f.size)}</span>
              <button className="file-remove" onClick={() => onRemoveFile(i)} title="Eliminar">&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
