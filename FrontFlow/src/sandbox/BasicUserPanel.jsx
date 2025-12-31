import React, { useState } from "react";

export default function BasicUserPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Basic Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white p-3 rounded-full hover:bg-gray-700 transition-colors"
      >
        👤
      </button>

      {/* Basic Dropdown */}
      {isOpen && (
        <div className="absolute top-16 right-0 bg-gray-800 text-white p-4 rounded-lg shadow-lg min-w-48">
          <div className="space-y-2">
            <div className="p-2 hover:bg-gray-700 rounded cursor-pointer">Profil</div>
            <div className="p-2 hover:bg-gray-700 rounded cursor-pointer">Ustawienia</div>
            <div className="p-2 hover:bg-gray-700 rounded cursor-pointer">Wyloguj</div>
          </div>
        </div>
      )}
    </div>
  );
}

