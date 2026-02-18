import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { torahDB } from "./utils/torahDB";

// Init IndexedDB early for fast cache access
torahDB.init();

createRoot(document.getElementById("root")!).render(<App />);
