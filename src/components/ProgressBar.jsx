/* Componente presentacional que muestra el progreso de conversión.
   Recibe via props:
   - progress: objeto { percent, detail } con el porcentaje y texto descriptivo
   - visible: booleano que controla si se renderiza

   Es un componente puro: no tiene estado interno ni efectos,
   solo transforma props en marcado JSX. */
export default function ProgressBar({ progress, visible }) {
  if (!visible) return null;

  const pct = Math.min(100, Math.max(0, progress.percent));

  return (
    <div className="progress-wrap show">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: pct + '%' }}></div>
      </div>
      <div className="progress-info">
        <span>{Math.round(pct)}%</span>
        <span>{progress.detail}</span>
      </div>
    </div>
  );
}
