#!/usr/bin/env node

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import server from "../src/lib/mcpServer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKEN_FILE_PATH = path.join(process.cwd(), ".ai-cc-token");

const command = process.argv[2];

if (command === "login") {
  // Start a local HTTP callback listener for OAuth/JWT redirection
  const port = 8989;
  const tempServer = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, `http://localhost:${port}`);
    if (reqUrl.pathname === "/callback") {
      const token = reqUrl.searchParams.get("token");
      if (token) {
        fs.writeFileSync(TOKEN_FILE_PATH, token, "utf8");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #060913; color: white;">
              <div style="background: rgba(255,255,255,0.05); padding: 2.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
                <h1 style="color: #10b981; margin-bottom: 1rem;">Login Successful!</h1>
                <p>Your authentication token has been saved to your local machine context.</p>
                <p style="color: #9ca3af; font-size: 0.9rem;">You may now close this browser window and return to your terminal.</p>
              </div>
            </body>
          </html>
        `);
        console.log(`[CLI] Token successfully retrieved and written to ${TOKEN_FILE_PATH}`);
        
        // Gracefully shutdown the listener
        setTimeout(() => {
          tempServer.close();
          process.exit(0);
        }, 1000);
        return;
      }
    }
    res.writeHead(400);
    res.end("Bad Request");
  });

  tempServer.listen(port, () => {
    console.log(`[CLI] Local login receiver active on http://localhost:${port}/callback`);
    console.log(`[CLI] Please log in through the browser to pass the token...`);
  });
} else if (command === "start-mcp") {
  console.error("[CLI] Connecting Model Context Protocol (MCP) server over stdio...");
  const transport = new StdioServerTransport();
  
  // Attach server to stdio transport channel
  server.connect(transport).then(() => {
    console.error("[CLI] MCP Server is successfully connected and listening.");
  }).catch((err) => {
    console.error("[CLI] Failed to connect MCP Server:", err);
    process.exit(1);
  });
} else {
  console.log(`
AI Command Center CLI Utility
=============================
Usage:
  node bin/ai-cc-cli.mjs <command>

Commands:
  login         Starts a local HTTP server on port 8989 to receive and save your login token.
  start-mcp     Starts the stdio-based MCP server to interface with your IDE.
  `);
}
