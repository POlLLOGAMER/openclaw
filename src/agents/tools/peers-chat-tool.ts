import { Type } from "@sinclair/typebox";
import crypto from "node:crypto";
import type { AnyAgentTool } from "./common.js";
import { loadConfig } from "../../config/config.js";
import { callGateway } from "../../gateway/call.js";
import { normalizeOutboundPayloadsForJson } from "../../infra/outbound/payloads.js";
import { jsonResult, readStringParam } from "./common.js";

const PeersChatToolSchema = Type.Object({
  peerId: Type.String({ minLength: 1 }),
  message: Type.String({ minLength: 1 }),
  agentId: Type.Optional(Type.String()),
  sessionKey: Type.Optional(Type.String()),
  timeoutSeconds: Type.Optional(Type.Number({ minimum: 0 })),
});

type GatewayAgentResponse = {
  runId?: string;
  status?: string;
  result?: {
    payloads?: unknown[];
    meta?: {
      durationMs?: number;
    };
  };
};

function normalizePeerId(value: string): string {
  return value.trim().toLowerCase();
}

function matchesAllow(allow: string[] | undefined, peerId: string): boolean {
  if (!allow || allow.length === 0) {
    return true;
  }
  return allow.some((pattern) => {
    const raw = String(pattern ?? "").trim();
    if (!raw) {
      return false;
    }
    if (raw === "*") {
      return true;
    }
    if (!raw.includes("*")) {
      return raw.toLowerCase() === peerId;
    }
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${escaped.replaceAll("\\*", ".*")}$`, "i");
    return re.test(peerId);
  });
}

export function createPeersChatTool(): AnyAgentTool {
  return {
    label: "Peer Chat",
    name: "peers_chat",
    description: "Send a message to a configured OpenClaw peer and return its reply.",
    parameters: PeersChatToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const peerIdRaw = readStringParam(params, "peerId", { required: true });
      const message = readStringParam(params, "message", { required: true });
      const agentId = readStringParam(params, "agentId");
      const sessionKey = readStringParam(params, "sessionKey");
      const timeoutSeconds = params.timeoutSeconds;
      const timeoutMs =
        typeof timeoutSeconds === "number" && Number.isFinite(timeoutSeconds)
          ? Math.max(0, Math.floor(timeoutSeconds * 1000))
          : 60_000;

      const cfg = loadConfig();
      const peerConfig = cfg.tools?.peers;
      if (peerConfig?.enabled !== true) {
        return jsonResult({
          status: "forbidden",
          error: "Peer chat is disabled. Set tools.peers.enabled=true to allow peers_chat.",
        });
      }

      const normalizedId = normalizePeerId(peerIdRaw);
      if (!matchesAllow(peerConfig.allow, normalizedId)) {
        return jsonResult({
          status: "forbidden",
          error: "Peer chat denied by tools.peers.allow.",
        });
      }

      const peer = (peerConfig.peers ?? []).find(
        (entry) => normalizePeerId(entry.id) === normalizedId,
      );
      if (!peer || peer.enabled === false) {
        return jsonResult({
          status: "error",
          error: `Unknown or disabled peer: ${peerIdRaw}`,
        });
      }

      try {
        const response = await callGateway<GatewayAgentResponse>({
          method: "agent",
          url: peer.url,
          token: peer.token,
          password: peer.password,
          tlsFingerprint: peer.tlsFingerprint,
          expectFinal: true,
          timeoutMs,
          params: {
            message,
            agentId: agentId ?? peer.agentId,
            sessionKey: sessionKey ?? peer.sessionKey,
            idempotencyKey: crypto.randomUUID(),
          },
        });

        const payloads = response?.result?.payloads ?? [];
        const normalizedPayloads = normalizeOutboundPayloadsForJson(payloads);
        const reply = normalizedPayloads
          .map((p) => p.text)
          .filter(Boolean)
          .join("\n")
          .trim();

        return jsonResult({
          status: response?.status ?? "ok",
          peerId: peer.id,
          runId: response?.runId,
          reply: reply || null,
          payloads: normalizedPayloads,
          meta: response?.result?.meta ?? null,
        });
      } catch (err) {
        return jsonResult({
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}
