import { useEffect } from 'react';

/* Componente de notificación flotante para errores.
   useEffect programa un cierre automático tras 6 segundos
   cuando visible = true. La función de limpieza (return)
    cancela el timer si el componente se desmonta antes. */
export default function ErrorToast({ title, message, visible, onClose }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 6000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="error-toast" onClick={onClose}>
      <div className="error-toast-title">{title}</div>
      <div className="error-toast-msg">{message}</div>
    </div>
  );
}
