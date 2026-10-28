const TZ = "America/Sao_Paulo";

function dois(n: number): string {
  return String(n).padStart(2, "0");
}

export function hojeISOLocal(): string {
  const n = new Date();
  return `${n.getFullYear()}-${dois(n.getMonth() + 1)}-${dois(n.getDate())}`;
}

export function isoParaBr(iso: string): string {
  const texto = String(iso ?? "").trim();
  const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return texto;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function brParaIso(br: string): string {
  const m = br.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${dois(Number(m[2]))}-${dois(Number(m[1]))}`;
}

export function mascararDataBr(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

export function formatarDataHora(iso: string): string {
  if (iso == null || iso === "") return "—";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return iso;
  const data = d.toLocaleDateString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = d.toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${data} ${hora}`;
}

export function formatarDuracao(segundos: number): string {
  if (!segundos || segundos < 1) return "menos de 1 s";
  if (segundos < 60) return `${segundos} s`;
  const min = Math.floor(segundos / 60);
  const s = segundos % 60;
  return s ? `${min} min ${s} s` : `${min} min`;
}

export function formatarValorCampo(valor: string): string {
  const texto = valor == null ? "" : String(valor).trim();
  if (!texto) return "vazio";
  const isoData = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoData) {
    const soData = `${isoData[3]}/${isoData[2]}/${isoData[1]}`;
    if (texto.includes("T") || texto.includes(" ")) {
      return formatarDataHora(texto);
    }
    return soData;
  }
  const euaAmPm = texto.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i,
  );
  if (euaAmPm) {
    const mes = Number(euaAmPm[1]);
    const dia = Number(euaAmPm[2]);
    let hora = Number(euaAmPm[4]);
    const ap = euaAmPm[7].toUpperCase();
    if (ap === "PM" && hora < 12) hora += 12;
    if (ap === "AM" && hora === 12) hora = 0;
    return formatarDataHora(
      `${euaAmPm[3]}-${dois(mes)}-${dois(dia)}T${dois(hora)}:${euaAmPm[5]}:${euaAmPm[6]}`,
    );
  }
  const eua = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/);
  if (eua) {
    const mes = Number(eua[1]);
    const dia = Number(eua[2]);
    if (mes > 12 && dia <= 12) {
      return eua[4] ? `${dois(mes)}/${dois(dia)}/${eua[3]} ${eua[4]}` : `${dois(mes)}/${dois(dia)}/${eua[3]}`;
    }
    return eua[4]
      ? `${dois(dia)}/${dois(mes)}/${eua[3]} ${eua[4]}`
      : `${dois(dia)}/${dois(mes)}/${eua[3]}`;
  }
  return texto;
}
