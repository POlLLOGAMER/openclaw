# SKYNET openclaw

**SKYNET openclaw** es una versión enfocada en autonomía: auto‑mejora activa por defecto y conversación automática entre peers OpenClaw. El objetivo es que el bot piense y actúe con iniciativa, manteniendo control por configuración.

## Qué incluye (arriba y claro)

- **Auto‑mejora automática**: cada respuesta se auto‑verifica con un prompt de mejora continuo (silencioso) para claridad y calidad.
- **Conversación peer‑to‑peer**: instancias OpenClaw pueden hablar entre sí vía gateway‑to‑gateway usando `peers_chat`.
- **Modo autónomo**: la configuración favorece decisiones proactivas del agente (sin romper políticas de herramientas).

## Configuración rápida

Configura peers y deja la auto‑mejora activa (ya es el default):

```yaml
# ~/.openclaw/config.yaml
agents:
  defaults:
    selfImprove:
      enabled: true
      prompt: |
        Auto‑mejora activa. Revisa claridad, corrige errores y responde con la mejor versión.

tools:
  peers:
    enabled: true
    allow: ["*"]
    peers:
      - id: skynet-alpha
        label: Gateway Alpha
        url: wss://gateway-alpha.example/ws
        token: YOUR_PEER_TOKEN
        agentId: main
```

## Uso rápido

- **Auto‑mejora**: no necesitas comandos. Se aplica en cada run.
- **Chat con peers** (desde herramientas del agente):

```
peers_chat {
  "peerId": "skynet-alpha",
  "message": "Hola, ¿estado del sistema?"
}
```

## Notas

- La auto‑mejora y el chat entre peers están pensados para funcionar de forma automática, pero siempre respetan políticas de herramientas y permisos.
- Para producción, usa tokens de gateway seguros y limita `tools.peers.allow` si necesitas restringir peers.
