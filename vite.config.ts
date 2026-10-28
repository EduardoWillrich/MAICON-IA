import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const nomeRede = "maicon.conlinebr.com.br";
const portaPublica = 5173;
const pfx = path.resolve("certs/dev.pfx");
const https = fs.existsSync(pfx)
  ? { pfx: fs.readFileSync(pfx), passphrase: "maicon-dev" }
  : undefined;

function redirecionaIp() {
  return {
    name: "redireciona-ip",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const host = String(req.headers.host || "").replace(/:\d+$/, "");
        const redeInterna = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;
        if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || redeInterna.test(host)) {
          next();
          return;
        }
        res.writeHead(302, { Location: `https://${nomeRede}:${portaPublica}${req.url || "/"}` });
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), redirecionaIp()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    https,
    allowedHosts: true,
    hmr: false,
    watch: {
      ignored: ["**/server/**", "**/.env", "**/.env.*", "**/tsconfig.json", "**/tsconfig.*.json", "**/sql/**", "**/certs/**"],
    },
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
  preview: { host: true, port: 5173, https, allowedHosts: [nomeRede] },
});
