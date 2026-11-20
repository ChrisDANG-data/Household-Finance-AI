/** The app uses Claude for all text generation. */
export type AiProvider = "claude";

export interface AiProviderConfig {
  claude: boolean;
  stt_cloud: boolean;
  stt_local: boolean;
  default: AiProvider;
}
