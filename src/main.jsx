import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./pdf.css";

// Prova colori PhysioCare Nyon (reversibile): commenta la riga per tornare al blu default.
document.documentElement.classList.add("theme-pcn-try");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);