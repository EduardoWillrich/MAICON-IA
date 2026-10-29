FROM node:22.20-bookworm
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates   && rm -rf /var/lib/apt/lists/*
ARG CACHEBUST=7df501e
RUN echo "cachebust=$CACHEBUST"   && git clone --depth 40 --branch main https://github.com/EduardoWillrich/MAICON-IA.git .   && git checkout 7df501eb831cbb5e8352ba862bc02d6dad63c0af   && git rev-parse --short HEAD
ENV MAICON_GIT_SHA=7df501eb831cbb5e8352ba862bc02d6dad63c0af
RUN npm ci
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build   && node -e 'const fs=require("fs");const p="server/index.js";let s=fs.readFileSync(p,"utf8");if(s.includes("express.static"))process.exit(0);const q=String.fromCharCode(34);const n=String.fromCharCode(10);const a="import express from "+q+"express"+q+";";if(!s.includes(a))process.exit(1);s=s.replace(a,a+n+"import path from "+q+"node:path"+q+";"+n+"import {fileURLToPath as F} from "+q+"node:url"+q+";");const m="const porta = Number(process.env.PORT || 8787);";const b="const r=path.resolve(path.dirname(F(import.meta.url)),"+q+"../dist"+q+");app.use(express.static(r));app.use((x,y,z)=>{if(x.path.startsWith("+q+"/api"+q+")||x.method!="+q+"GET"+q+"&&x.method!="+q+"HEAD"+q+")return z();y.sendFile(path.join(r,"+q+"index.html"+q+"));});";if(!s.includes(m))process.exit(1);fs.writeFileSync(p,s.replace(m,b+m));'
ENV MAICON_DATA_DIR=/data
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/index.js"]
