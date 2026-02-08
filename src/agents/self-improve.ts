import type { OpenClawConfig } from "../config/config.js";
import { resolveAgentConfig } from "./agent-scope.js";

const DEFAULT_SELF_IMPROVE_PROMPT = [
  "Auto-improvement mode is enabled.",
  "Before responding, check for clarity, correctness, and missing steps.",
  "Fix issues silently; do not mention the self-check unless asked.",
].join("\n");

export function resolveSelfImprovePrompt(params: {
  config: OpenClawConfig;
  agentId?: string;
}): string | undefined {
  const agentId = params.agentId?.trim();
  const agentSelfImprove = agentId
    ? resolveAgentConfig(params.config, agentId)?.selfImprove
    : undefined;
  const defaults = params.config.agents?.defaults?.selfImprove;
  const enabled = agentSelfImprove?.enabled ?? defaults?.enabled ?? true;
  if (!enabled) {
    return undefined;
  }
  const prompt = (
    agentSelfImprove?.prompt ??
    defaults?.prompt ??
    DEFAULT_SELF_IMPROVE_PROMPT
  ).trim();
  return prompt ? prompt : undefined;
}
