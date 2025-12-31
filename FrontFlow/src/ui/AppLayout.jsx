import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/Header.jsx"; // Poprawiona ścieżka do właściwego komponentu

export default function AppLayout() {
  return (
    <div className="ff-app">
      <Header />
      <main className="ff-main"><Outlet /></main>
    </div>
  );
}
