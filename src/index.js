import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { NavigationProvider } from "./context/NavigationContext";
import { TenantProvider } from "./context/TenantContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <NavigationProvider>
      <TenantProvider>
        <App />
      </TenantProvider>
    </NavigationProvider>
  </React.StrictMode>
);

reportWebVitals();