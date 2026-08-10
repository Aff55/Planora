import type { CompanionStatus } from "./types";

/**
 * Companion constants, kept in one place because both the dock and the full
 * conversation surface must agree with the server.
 */

/** `companionChatSchema` caps a message at 800 characters server-side. */
export const COMPANION_MESSAGE_LIMIT = 800;

/**
 * The API allows Ollama 60s and then falls back to deterministic rules, so the
 * client has to outlast that or it would abort a request that was about to
 * succeed.
 */
export const COMPANION_TIMEOUT_MS = 75_000;

/**
 * Names the provider honestly. When the local model is unreachable the
 * companion still answers — from Planora's own planning rules — and saying so
 * is more useful than implying a model replied.
 */
export function providerLabel(status: CompanionStatus): string {
  return status.ollamaAvailable ? status.model : "Planora rules (model offline)";
}
