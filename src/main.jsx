import React from "react";
import ReactDOM from "react-dom/client";
import "./db-shim.js";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
