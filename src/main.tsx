import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import App from "./App";
import '@mantine/core/styles.css';   // 🔑 This brings in all Mantine styles

ReactDOM.createRoot(document.getElementById("root")!).render(
  <MantineProvider defaultColorScheme="dark">
    <App />
  </MantineProvider>
);