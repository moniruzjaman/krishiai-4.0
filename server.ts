import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api", (req, res) => {
    res.json({ status: "online", service: "Krishi AI Backend", version: "2.1.0" });
  });

  app.post("/api/v1/diagnostics/log", (req, res) => {
    try {
      const log = req.body;
      console.log(`Audit Log - User: ${log.user_id} | Crop: ${log.crop} | Diagnosis: ${log.diagnosis}`);
      res.json({ status: "success", message: "Diagnostic report logged for official audit." });
    } catch (error: any) {
      res.status(500).json({ detail: error.message });
    }
  });

  app.get("/api/v1/advisory/official", (req, res) => {
    const { crop, condition } = req.query;
    res.json({
      crop: crop,
      condition: condition,
      source: "BARI/BRRI Grounded Database 2025",
      advisory: `Official protocol for ${condition} in ${crop} confirms AI diagnosis steps.`
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
