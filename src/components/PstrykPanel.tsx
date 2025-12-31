import React, { useState } from "react";
import "./PstrykPanel.css";

export default function PstrykPanel() {
  const [open, setOpen] = useState(false);

  const togglePanel = () => {
    setOpen(!open);
  };

  return (
    <>
      <div className={`pstryk-button ${open ? "active" : ""}`} onClick={togglePanel}>
        ⚡
      </div>

      <div className={`pstryk-overlay ${open ? "open" : ""}`} onClick={togglePanel}>
        <div className="pstryk-content" onClick={(e) => e.stopPropagation()}>
          <h2>Amber Panel</h2>
          <p>Witaj w strefie FreeFlow 🔥</p>
          <ul>
            <li>🎧 Voice Assistant</li>
            <li>💬 Chat & Write</li>
            <li>🍽 Restauracje</li>
            <li>🚕 Taxi</li>
            <li>🏨 Hotele</li>
          </ul>
        </div>
      </div>
    </>
  );
}












