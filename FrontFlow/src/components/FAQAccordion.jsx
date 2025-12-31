import React, { useState } from 'react'

export default function FAQAccordion({ items = [] }) {
  const [open, setOpen] = useState(null)
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {items.map((it, idx) => (
        <div key={idx} className="card-glass p-4 rounded-md">
          <button className="w-full flex justify-between items-center" onClick={() => setOpen(open === idx ? null : idx)}>
            <div>
              <h4 className="text-white font-medium">{it.q}</h4>
              <p className="text-sm text-gray-300">{it.category}</p>
            </div>
            <div>{open === idx ? '−' : '+'}</div>
          </button>
          {open === idx && <div className="mt-3 text-gray-200">{it.a}</div>}
        </div>
      ))}
    </div>
  )
}


