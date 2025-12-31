import React from "react";
import { useNavigate } from "react-router-dom";
import MiniCartBoard from "../components/MiniCartBoard.jsx";

export default function CartBoard() {
  const nav = useNavigate();

  // TODO: podepnij pod realny koszyk
  const items = [
    { id: 1, title: "Margarita", note: "cienkie ciasto", qty: 1, price: 26.99 },
    { id: 2, title: "Capricciosa", note: "bez pieczarek", qty: 2, price: 32.50 },
  ];

  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="ff-cartWrap">
      <div className="ff-cartBoard">
        {/* pinezki */}
        <span className="ff-pin ff-pin--tl" />
        <span className="ff-pin ff-pin--tr" />
        <span className="ff-pin ff-pin--bl" />
        <span className="ff-pin ff-pin--br" />

        <h1 className="ff-cartTitle">Koszyk</h1>

        <MiniCartBoard items={items} />

        <ul className="ff-cartList">
          {items.map((it) => (
            <li key={it.id} className="ff-cartItem">
              <div className="ff-cartItem__left">
                <div className="ff-itemTitle">{it.title}</div>
                {it.note && <div className="ff-itemNote">{it.note}</div>}
              </div>
              <div className="ff-cartItem__right">
                <div className="ff-qty">{it.qty}×</div>
                <div className="ff-price">{(it.qty * it.price).toFixed(2)} zł</div>
                <button className="ff-remove" title="Usuń">✕</button>
              </div>
            </li>
          ))}
        </ul>

        <div className="ff-cartFooter">
          <div className="ff-total">
            Razem: <strong>{total.toFixed(2)} zł</strong>
          </div>
          <div className="ff-cartBtns">
            <button className="ff-btnGhost" onClick={() => nav("/")}>Kontynuuj</button>
            <button className="ff-btnPrimary">Zamawiam</button>
          </div>
        </div>
      </div>
    </div>
  );
}


