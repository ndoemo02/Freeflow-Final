import React from 'react'
import { useToast } from '../state/toast'

export default function ToastStack(){
  const items = useToast((s) => s.items)
  const remove = useToast((s) => s.remove)
  return (
    <div className="ff-toasts">
      {items.map(t => (
        <div key={t.id} className={`ff-toast ${t.type === 'success' ? 'ff-toast--success' : t.type === 'error' ? 'ff-toast--error' : ''}`}>
          <span>{t.message}</span>
          <button className="ff-toast__close" aria-label="Zamknij" onClick={() => remove(t.id)}>×</button>
        </div>
      ))}
    </div>
  )
}


