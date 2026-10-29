const MODELOS = [
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemma-4-31b-it:free",
  "qwen/qwen3.8-27b",
];

export function modelosOpenRouter(preferido = process.env.OPENROUTER_MODEL) {
  const principal = String(preferido ?? "").trim();
  return [...new Set([principal, ...MODELOS].filter(Boolean))];
}
