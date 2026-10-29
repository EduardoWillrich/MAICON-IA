FROM node:22.20-bookworm
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ARG MAICON_GIT_SHA=
ENV MAICON_GIT_SHA=$MAICON_GIT_SHA
RUN npm run build \
 && node <<'NODE'
import fs from "node:fs";
const p = "server/index.js";
let s = fs.readFileSync(p, "utf8");
if (s.includes("express.static")) process.exit(0);
const q = '"';
const n = "\n";
const a = `import express from ${q}express${q};`;
if (!s.includes(a)) process.exit(1);
s = s.replace(a, a + n + `import path from ${q}node:path${q};` + n + `import {fileURLToPath as F} from ${q}node:url${q};`);
const m = "const porta = Number(process.env.PORT || 8787);";
const b = `const r=path.resolve(path.dirname(F(import.meta.url)),${q}../dist${q});app.use(express.static(r));app.use((x,y,z)=>{if(x.path.startsWith(${q}/api${q})||x.method!=${q}GET${q}&&x.method!=${q}HEAD${q})return z();y.sendFile(path.join(r,${q}index.html${q}));});`;
if (!s.includes(m)) process.exit(1);
fs.writeFileSync(p, s.replace(m, b + m));
NODE
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/index.js"]
