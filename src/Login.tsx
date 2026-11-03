import { useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import { fotoDoToken } from "./fotoGoogle";
import { gravarTokenGmail, gravarUsuario, gmailJaConcedido, limparSaida, type UsuarioGoogle } from "./sessao";
import { pedirTokenGmail, prepararLoginGoogle } from "./tokenGmail";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

type Pt = [number, number];

function rounded(points: Pt[], r: number): string {
  const n = points.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const v1: Pt = [p0[0] - p1[0], p0[1] - p1[1]];
    const v2: Pt = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(...v1);
    const l2 = Math.hypot(...v2);
    const k = Math.min(r, l1 / 2, l2 / 2);
    const a: Pt = [p1[0] + (v1[0] / l1) * k, p1[1] + (v1[1] / l1) * k];
    const b: Pt = [p1[0] + (v2[0] / l2) * k, p1[1] + (v2[1] / l2) * k];
    d += `${i === 0 ? "M" : "L"}${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${p1[0]} ${p1[1]} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  return d + "Z";
}

const SHAPES: string[] = [
  rounded([[231, 4], [287, 58], [231, 114], [175, 58]], 12),
  rounded([[4, 222], [112, 116], [231, 116], [62, 283]], 10),
  rounded([[457, 222], [350, 116], [231, 116], [400, 283]], 10),
  rounded([[92, 313], [183, 224], [278, 224], [370, 313], [322, 366], [231, 292], [140, 366]], 10),
];

function Logo({ rx, ry }: { rx: number; ry: number }) {
  return (
    <svg
      className="logo"
      viewBox="0 0 461 374"
      style={{ ["--rx" as string]: `${rx}deg`, ["--ry" as string]: `${ry}deg` }}
      role="img"
      aria-label="MAICON AI"
    >
      <g className="b">
        {SHAPES.map((d, i) => <path key={i} d={d} pathLength={1} />)}
      </g>
      <g className="c">
        {SHAPES.map((d, i) => <path key={i} d={d} pathLength={1} />)}
      </g>
    </svg>
  );
}

function useBackdrop(ref: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const paths = SHAPES.map((d) => new Path2D(d));

    const TILE_W = 46;
    const GX = 92, GY = 68;
    const s = TILE_W / 461;
    const TILE_H = 374 * s;
    const HOVER_R = 170;
    const RIPPLE_SPEED = 640;
    const RIPPLE_LIFE = 1.7;
    const RIPPLE_BAND = 110;

    const ease = (u: number) => u * u * (3 - 2 * u);
    const mouse = { x: 0, y: 0, on: false };
    const cur = { x: 0, y: 0, p: 0 };
    const ripples: { x: number; y: number; t0: number }[] = [];

    let w = 0, h = 0, raf = 0, last = 0;
    let tiles: { x: number; y: number; cx: number; cy: number; glow: number }[] = [];
    let sprite: HTMLCanvasElement;

    const strokeTile = (c: CanvasRenderingContext2D, x: number, y: number, e: number) => {
      const k = 1 + 0.38 * e;
      const m = Math.min(1, e * 3);
      const wht = e * e;
      const lw = 1.1 + 1.4 * e;
      c.save();
      c.translate(x + TILE_W / 2, y + TILE_H / 2);
      c.scale(s * k, s * k);
      c.translate(-461 / 2, -374 / 2);
      c.lineJoin = "round";
      c.lineCap = "round";
      if (e > 0.04) {
        c.strokeStyle = `rgba(255,71,87,${(0.22 * e).toFixed(3)})`;
        c.lineWidth = (lw * 3.6) / (s * k);
        for (const p of paths) c.stroke(p);
      }
      c.strokeStyle = `rgba(255,${Math.round(150 - 79 * m + 150 * wht)},${Math.round(160 - 73 * m + 140 * wht)},${(0.035 + 0.91 * e).toFixed(3)})`;
      c.lineWidth = lw / (s * k);
      for (const p of paths) c.stroke(p);
      c.restore();
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      tiles = [];
      for (let r = 0, y = -20; y < h + GY; r++, y += GY) {
        for (let x = (r % 2 ? GX / 2 : 0) - 20; x < w + GX; x += GX) {
          tiles.push({ x, y, cx: x + TILE_W / 2, cy: y + TILE_H / 2, glow: 0 });
        }
      }

      sprite = document.createElement("canvas");
      sprite.width = Math.ceil((TILE_W + 8) * dpr);
      sprite.height = Math.ceil((TILE_H + 8) * dpr);
      const sc = sprite.getContext("2d")!;
      sc.setTransform(dpr, 0, 0, dpr, 0, 0);
      strokeTile(sc, 4, 4, 0);
    };

    const routes = [
      { a: [0.52, 0.04], c1: [0.7, 0.02], c2: [0.8, 0.12], b: [0.74, 0.34] },
      { a: [0.02, 0.62], c1: [0.2, 0.5], c2: [0.4, 0.7], b: [0.62, 0.52] },
      { a: [0.3, 0.98], c1: [0.4, 0.7], c2: [0.7, 0.9], b: [0.96, 0.66] },
    ];

    const frame = (ms: number) => {
      const t = ms / 1000;
      const dt = Math.min(0.05, last ? (ms - last) / 1000 : 0.016);
      last = ms;

      const g = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, Math.max(w, h) * 0.85);
      g.addColorStop(0, "#0c0407");
      g.addColorStop(1, "#030102");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.setLineDash([3, 7]);
      ctx.lineDashOffset = -t * 8;
      ctx.strokeStyle = "rgba(255,150,160,.1)";
      ctx.lineWidth = 1;
      for (const r of routes) {
        ctx.beginPath();
        ctx.moveTo(r.a[0] * w, r.a[1] * h);
        ctx.bezierCurveTo(r.c1[0] * w, r.c1[1] * h, r.c2[0] * w, r.c2[1] * h, r.b[0] * w, r.b[1] * h);
        ctx.stroke();
      }
      ctx.restore();

      if (!reduce) {
        cur.x += (mouse.x - cur.x) * (1 - Math.exp(-dt * 16));
        cur.y += (mouse.y - cur.y) * (1 - Math.exp(-dt * 16));
        cur.p += ((mouse.on ? 1 : 0) - cur.p) * (1 - Math.exp(-dt * 6));
        if (cur.p > 0.01) {
          const R = HOVER_R * 1.5;
          const sp = ctx.createRadialGradient(cur.x, cur.y, 0, cur.x, cur.y, R);
          sp.addColorStop(0, `rgba(255,71,87,${(0.14 * cur.p).toFixed(3)})`);
          sp.addColorStop(1, "rgba(255,71,87,0)");
          ctx.fillStyle = sp;
          ctx.fillRect(cur.x - R, cur.y - R, R * 2, R * 2);
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const age = t - ripples[i].t0;
        if (age > RIPPLE_LIFE) { ripples.splice(i, 1); continue; }
        const rp = ripples[i];
        const fade = 1 - ease(age / RIPPLE_LIFE);
        ctx.strokeStyle = `rgba(255,110,125,${(0.4 * fade).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, age * RIPPLE_SPEED, 0, Math.PI * 2);
        ctx.stroke();
        if (age < 0.35) {
          const fl = 1 - age / 0.35;
          const fg = ctx.createRadialGradient(rp.x, rp.y, 0, rp.x, rp.y, 90);
          fg.addColorStop(0, `rgba(255,120,135,${(0.35 * fl).toFixed(3)})`);
          fg.addColorStop(1, "rgba(255,71,87,0)");
          ctx.fillStyle = fg;
          ctx.fillRect(rp.x - 90, rp.y - 90, 180, 180);
        }
      }

      const up = 1 - Math.exp(-dt * 14);
      const down = 1 - Math.exp(-dt * 3.2);
      const hw = TILE_W / 2 + 4, hh = TILE_H / 2 + 4;
      for (const tl of tiles) {
        let target = 0;
        if (!reduce) {
          const u = Math.max(0, 1 - Math.hypot(tl.cx - cur.x, tl.cy - cur.y) / HOVER_R);
          target = Math.max(target, ease(u) * cur.p);
          for (const rp of ripples) {
            const age = t - rp.t0;
            const band = Math.max(0, 1 - Math.abs(Math.hypot(tl.cx - rp.x, tl.cy - rp.y) - age * RIPPLE_SPEED) / RIPPLE_BAND);
            target = Math.max(target, ease(band) * (1 - ease(age / RIPPLE_LIFE)));
          }
          tl.glow += (target - tl.glow) * (target > tl.glow ? up : down);
        } else {
          tl.glow = target;
        }
        if (tl.glow < 0.01) ctx.drawImage(sprite, tl.cx - hw, tl.cy - hh, hw * 2, hh * 2);
        else strokeTile(ctx, tl.x, tl.y, tl.glow);
      }

      if (!reduce) raf = requestAnimationFrame(frame);
    };

    resize();
    raf = requestAnimationFrame(frame);
    const onResize = () => {
      resize();
      if (reduce) requestAnimationFrame(frame);
    };
    const onMove = (e: PointerEvent) => {
      if (!mouse.on) { cur.x = e.clientX; cur.y = e.clientY; }
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.on = true;
    };
    const onDown = (e: PointerEvent) => {
      onMove(e);
      ripples.push({ x: e.clientX, y: e.clientY, t0: performance.now() / 1000 });
      if (ripples.length > 6) ripples.shift();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") mouse.on = false;
    };
    const onLeave = () => { mouse.on = false; };

    window.addEventListener("resize", onResize);
    if (!reduce) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      document.documentElement.addEventListener("pointerleave", onLeave);
      window.addEventListener("blur", onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [ref]);
}

export function Login({ onEntrar }: { onEntrar: (usuario: UsuarioGoogle) => void }) {
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let ativo = true;
    void prepararLoginGoogle()
      .then(() => {
        if (ativo) setPronto(true);
      })
      .catch((e: unknown) => {
        if (!ativo) return;
        setPronto(false);
        setErro(e instanceof Error ? e.message : "Não foi possível carregar o login do Google.");
      });
    return () => {
      ativo = false;
    };
  }, []);

  function mensagemGoogle(erro: string) {
    if (erro === "popup_closed" || erro === "popup_closed_by_user") {
      return "A janela do Google fechou antes de concluir. Clique outra vez e escolha a conta.";
    }
    if (erro === "popup_failed_to_open") {
      return "O navegador bloqueou a janela do Google. Permita pop-ups deste site e tente de novo.";
    }
    if (erro === "access_denied") return "O Google não autorizou o acesso.";
    if (erro === "timeout") return "O Google não respondeu. Tente outra vez.";
    return "O Google não confirmou a conta.";
  }

  function entrar() {
    if (!CLIENT_ID || !pronto || entrando) return;
    setErro("");
    setEntrando(true);
    limparSaida();
    const pedido = pedirTokenGmail(gmailJaConcedido() ? undefined : "consent");
    void pedido
      .then(async (resp) => {
        if (!resp.access_token) throw new Error(mensagemGoogle(String(resp.error ?? "")));
        const escopo = String(resp.scope ?? "");
        if (escopo && !escopo.includes("gmail.readonly")) {
          throw new Error("A conta entrou, mas o Google não liberou a leitura do Gmail. Entre de novo e marque o acesso aos e-mails.");
        }
        const perfil = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${resp.access_token}` },
        });
        const dados = (await perfil.json()) as { email?: string; name?: string; picture?: string };
        if (!perfil.ok || !dados.email) throw new Error("Não foi possível ler a conta Google.");
        const foto = (await fotoDoToken(resp.access_token)) || dados.picture || "";
        const usuario = { email: dados.email, nome: dados.name || dados.email, foto };
        const segundos = Number(resp.expires_in) || 3600;
        gravarUsuario(usuario);
        gravarTokenGmail(resp.access_token, Date.now() + segundos * 1000);
        onEntrar(usuario);
      })
      .catch((e: unknown) => {
        setErro(e instanceof Error ? e.message : "Falha ao entrar com Google.");
      })
      .finally(() => setEntrando(false));
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  useBackdrop(canvasRef);

  function inclinar(e: MouseEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -y * 14, ry: x * 14 });
  }

  return (
    <div className="login-page">
      <canvas ref={canvasRef} className="login-bg" aria-hidden="true" />
      <main className="wrap">
        <section className="hero" onMouseMove={inclinar} onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}>
          <Logo rx={tilt.rx} ry={tilt.ry} />
          <div className="br">MAICON <span>AI</span></div>
          <h1>Seu comércio exterior,<br /><b>em movimento.</b></h1>
          <p>Acompanhe embarques, documentos e operações em um só lugar, de qualquer porto do mundo.</p>
        </section>
        <section className="card">
          <h2>Bem-vindo de volta</h2>
          <p className="s">Acesse o painel de operações.</p>
          {CLIENT_ID ? (
            <button className="go" type="button" onClick={entrar} disabled={!pronto || entrando}>
              <svg className="g" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.3-4 6.8-9.9 6.8-16.9z" />
                <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.8 2.3-8.8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
              </svg>
              <span>{entrando ? "Entrando..." : "Entrar com Google"}</span>
            </button>
          ) : (
            <p className="s">Defina VITE_GOOGLE_CLIENT_ID no arquivo .env e reinicie o Vite para habilitar o botão do Google.</p>
          )}
          <p className="msg" role="status" aria-live="polite">{erro}</p>
          <p className="ft">© MAICON AI · Conline</p>
        </section>
      </main>
    </div>
  );
}
