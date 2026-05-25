/**
 * Typed environment access for server-side code.
 * Validates required variables at runtime when accessed.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const env = {
  nodeEnv: optionalEnv("NODE_ENV", "development"),
  databaseUrl: () => requireEnv("DATABASE_URL"),
  appUrl: optionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  ai: {
    openaiApiKey: () => optionalEnv("OPENAI_API_KEY"),
    anthropicApiKey: () => optionalEnv("ANTHROPIC_API_KEY"),
  },

  upload: {
    maxSizeMb: Number(optionalEnv("UPLOAD_MAX_SIZE_MB", "25")),
    storageProvider: optionalEnv("STORAGE_PROVIDER", "local"),
  },

  ocr: {
    provider: () => optionalEnv("OCR_PROVIDER"),
  },

  vector: {
    provider: () => optionalEnv("VECTOR_STORE_PROVIDER"),
  },

  tts: {
    provider: () => optionalEnv("TTS_PROVIDER"),
  },
} as const;

export function isDevelopment(): boolean {
  return env.nodeEnv === "development";
}
