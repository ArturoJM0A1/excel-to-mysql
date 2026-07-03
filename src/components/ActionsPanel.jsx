/* Panel de acciones que agrupa botones y opciones de configuración.
   Separa la presentación de la lógica: recibe callbacks como props
   y notifica cambios mediante los setters que también recibe.

   Los checkboxes usan el patrón de input controlado:
   - checked se vincula al estado (useTransaction, useDropTable)
   - onChange actualiza el estado vía el setter correspondiente

   El input de texto para el nombre del archivo también es
   controlado: value = fileName, onChange = setFileName.

   Los botones se deshabilitan condicionalmente:
   - Convertir: deshabilitado durante la conversión (isConverting)
   - Descargar: deshabilitado si no hay SQL o si se está convirtiendo */
export default function ActionsPanel({
  isConverting,
  hasSql,
  useTransaction,
  setUseTransaction,
  useDropTable,
  setUseDropTable,
  fileName,
  setFileName,
  onConvert,
  onDownload,
}) {
  return (
    <div className="card">
      <div className="card-title">Acciones</div>
      <div className="actions-row">
        <button
          className={'btn btn-primary' + (isConverting ? ' loading' : '')}
          onClick={onConvert}
          disabled={isConverting}
        >
          {isConverting && <span className="btn-spinner"></span>}
          <span className="btn-text">Convertir</span>
        </button>
        <button
          className="btn btn-success"
          onClick={onDownload}
          disabled={!hasSql || isConverting}
        >
          Descargar SQL
        </button>
      </div>
      <div className="opt-row">
        <label>
          <input
            type="checkbox"
            checked={useTransaction}
            onChange={(e) => setUseTransaction(e.target.checked)}
          />
          {' '}Incluir START TRANSACTION / COMMIT
        </label>
        <label>
          <input
            type="checkbox"
            checked={useDropTable}
            onChange={(e) => setUseDropTable(e.target.checked)}
          />
          {' '}Incluir DROP TABLE IF EXISTS
        </label>
        <div className="filename-input">
          <label>Nombre:</label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
