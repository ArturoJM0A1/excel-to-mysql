/* Componente presentacional que muestra contadores de la conversión.
   No administra estado — recibe todo via props desde App.jsx.

   totalSheets proviene del hook useConverter y refleja
   la cantidad de hojas detectadas en los archivos cargados.
   tables contiene las tablas ya procesadas, totalRows la suma
   de registros de todas ellas.

   El uso de toLocaleString() en totalRows formatea el número
   con separadores de miles según la locale del navegador. */
export default function StatsPanel({ files, totalSheets, tables, totalRows }) {
  return (
    <div className="card">
      <div className="card-title">Resumen</div>
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-num">{files.length}</div>
          <div className="stat-label">Archivos</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{totalSheets}</div>
          <div className="stat-label">Hojas</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{tables.length}</div>
          <div className="stat-label">Tablas</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{totalRows.toLocaleString()}</div>
          <div className="stat-label">Registros</div>
        </div>
      </div>
    </div>
  );
}
