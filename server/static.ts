import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const publicPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(publicPath)) {
    throw new Error(
      `Could not find the public directory: ${publicPath}. Make sure to run the build command first.`
    );
  }

  // Serve static files from the public directory
  app.use(express.static(publicPath));

  // Handle React app routes - serve index.html for all non-API routes
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(publicPath, "index.html"));
  });
}
