import React from "react";

export default function MiniCartBoard({ items = [] }) {
  const demo = items.length ? items : [
    { id: 1, title: "Margarita", qty: 1, price: 26.99 },
    { id: 2, title: "Capricciosa", qty: 2, price: 32.5 },
  ];
  const total = demo.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="ff-miniBoard">
      <span className="ff-pin ff-pin--tl" />
      <span className="ff-pin ff-pin--tr" />

      <div className="ff-miniHeader">
        <span>Twój koszyk</span>
        <span className="ff-miniTotal">{total.toFixed(2)} zł</span>
      </div>

      <ul className="ff-miniList">
        {demo.map(it => (
          <li key={it.id} className="ff-miniItem">
            <span className="ff-miniDot" />
            <span className="ff-miniTitle">{it.title}</span>
            <span className="ff-miniQty">{it.qty}×</span>
            <span className="ff-miniPrice">{(it.qty * it.price).toFixed(2)} zł</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


