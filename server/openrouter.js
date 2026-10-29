const MODELO = "deepseek/deepseek-v4.1-flash-1017";

export function modelosOpenRouter(preferido = process.env.OPENROUTER_MODEL) {
  const principal = String(preferido ?? "").trim() || MODELO;
  return [principal];
}
