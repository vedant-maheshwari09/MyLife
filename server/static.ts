import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const clientPath = path.resolve(import.meta.dirname, "..", "client");

  if (!fs.existsSync(clientPath)) {
    throw new Error(
      `Could not find the client directory: ${clientPath}`,
    );
  }

  // Serve static files from client directory
  app.use(express.static(clientPath));
  
  // Serve src files for React imports
  app.use('/src', express.static(path.join(clientPath, 'src')));

  // Handle React app routes - serve index.html for all non-API routes
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(clientPath, "index.html"));
  });
}
