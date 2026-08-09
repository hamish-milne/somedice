import "./index.css";
import { render } from "preact";
import { StrictMode } from "preact/compat";
import App from "./App";

render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.body,
);
