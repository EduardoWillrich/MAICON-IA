// const MODELO_DEEPSEEK = "deepseek/deepseek-v4.1-flash-1017";
// const MODELO_GLM = "z-ai/glm-5.3-flash";
const MODELO = "gemma-4-31b-it";
export const MODELO_RESPOSTA = MODELO;
export const MODELO_OPENROUTER = "google/gemma-4-31b-it";

export function modelosOpenRouter(preferido = process.env.GOOGLE_MODEL) {
  const principal = String(preferido ?? "").trim();
  if (!principal || principal === MODELO) return [MODELO_OPENROUTER];
  if (principal.includes("/")) return [principal];
  return [`google/${principal}`];
}

export function modeloDaEtapa() {
  return modelosOpenRouter()[0];
}
