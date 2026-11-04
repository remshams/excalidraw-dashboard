import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// First, so the components' CSS modules come after the base rules.
import "./styles.css";
import { App } from "./App.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
