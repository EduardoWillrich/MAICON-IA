import net from "node:net";
import os from "node:os";

const PORTA = 5173;
const VITE = 5174;
const NOME = "maicon.conlinebr.com.br";

function destinoDe(pedido) {
  const linhas = pedido.split("\r\n");
  const caminho = (linhas[0] || "").split(" ")[1] || "/";
  const host = (linhas.find((linha) => /^host:/i.test(linha)) || "").split(":")[1]?.trim() || "";
  const redeInterna = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;
  const alvo = host === "localhost" || host === "127.0.0.1" || redeInterna.test(host) ? host : NOME;
  const seguro = caminho.startsWith("/") ? caminho : "/";
  return `https://${alvo}:${PORTA}${seguro}`;
}

const servidor = net.createServer((socket) => {
  socket.once("data", (chunk) => {
    if (chunk[0] === 0x16) {
      const vite = net.connect(VITE, "127.0.0.1", () => {
        vite.write(chunk);
        socket.pipe(vite);
        vite.pipe(socket);
      });
      vite.on("error", () => socket.destroy());
      socket.on("error", () => vite.destroy());
      return;
    }
    const destino = destinoDe(chunk.toString("latin1"));
    const corpo = "Redirecionando para o endereco seguro.";
    socket.end(
      [
        "HTTP/1.1 302 Found",
        `Location: ${destino}`,
        "Content-Type: text/plain; charset=utf-8",
        `Content-Length: ${Buffer.byteLength(corpo)}`,
        "Connection: close",
        "",
        corpo,
      ].join("\r\n"),
    );
  });
  socket.on("error", () => socket.destroy());
});

function ipsInternos() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => item.address)
    .filter((ip) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(ip));
}

servidor.listen(PORTA, "0.0.0.0", () => {
  console.log(`Abra https://${NOME}:${PORTA}`);
  for (const ip of ipsInternos()) console.log(`Rede interna em https://${ip}:${PORTA}`);
});
