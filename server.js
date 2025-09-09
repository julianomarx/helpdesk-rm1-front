import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, "public")));

// SPA fallback: qualquer rota não encontrada cai no index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Front rodando em http://127.0.0.1:${PORT}`);
});
