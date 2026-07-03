import { useEffect, useRef } from 'react';

/* Mapa de tipos de log a clases CSS para colorear los mensajes. */
const TYPE_CLASS = {
  info: 'entry-info',
  success: 'entry-success',
  warning: 'entry-warning',
  error: 'entry-error',
};

/* Componente que muestra los mensajes de la conversión en una consola.
   useRef (bottomRef) crea una referencia al final de la lista.
   useEffect se ejecuta cada vez que logs cambia y hace scroll
   automático al último mensaje mediante scrollIntoView. */
export default function Console({ logs, visible }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!visible) return null;

  return (
    <div className="card">
      <div className="card-title">Consola</div>
      <div className="console show">
        {logs.length === 0 && (
          <div className="entry entry-info">
            <span className="console-time">[{new Date().toLocaleTimeString()}]</span> Aplicaci&oacute;n lista. Carga archivos Excel y haz clic en Convertir.
          </div>
        )}
        {logs.map((entry, i) => (
          <div key={i} className={'entry ' + (TYPE_CLASS[entry.type] || 'entry-info')}>
            <span className="console-time">[{entry.time}]</span> {entry.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
