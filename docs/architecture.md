# Architecture

Agent44 is an MCP stdio proxy. It exposes an MCP server to an upstream client
and creates an MCP client session to a downstream server process. Tool
discovery is forwarded. Tool calls are forwarded unchanged when no policy is
configured; with a policy, a decision is made before a call is sent downstream.

## Components

- **Upstream MCP client:** an AI agent or MCP host that starts the proxy and
  speaks MCP over stdio.
- **Proxy (`agent44.proxy`):** starts and initializes the downstream process,
  serves upstream MCP requests, and routes `tools/list` and `tools/call`.
- **Policy engine (`agent44.policy`):** validates YAML configuration and
  evaluates the configured deterministic tiers.
- **Decision adapter:** optional. It can be reached only after deterministic
  tiers return unresolved for a tool listed in `adapter_tools`. It is not
  called for every request.
- **Observation (`agent44.observe`):** optional JSONL logging enabled by
  `--observe`. It records safe argument summaries, decision metadata, and the
  call outcome. It is not a required processing stage.
- **Downstream MCP server:** a subprocess communicating with the proxy over
  stdio. A denied call is never sent to it.

## Request flow

```mermaid
sequenceDiagram
    participant C as Agent / MCP client
    participant P as Agent44 proxy
    participant E as Policy engine
    participant A as Decision adapter
    participant O as Optional observer
    participant D as Downstream MCP server

    C->>P: tools/call(name, arguments)
    Note over P: Build call context; parse opt-in delegation and provenance state
    opt --policy configured
        P->>E: decide(tool, business arguments, contexts)
        alt Deterministic tier decides
            E-->>P: ALLOW or DENY
        else UNDECIDED and tool ∈ adapter_tools
            E->>A: decide(tool, safe argument metadata, eligible rules)
            A-->>E: ALLOW / DENY / failure
            Note over E: Adapter failure or unresolved result becomes DENY
            E-->>P: final ALLOW or DENY
        else No eligible adapter
            E-->>P: configured default decision
        end
    end
    alt Denied
        opt observer enabled
            P->>O: record denial and decision evidence
        end
        P-->>C: tool-level error; no downstream call
    else Allowed or no policy
        P->>D: tools/call with business arguments
        D-->>P: tool result
        opt observer enabled
            P->>O: record outcome and safe metadata
        end
        P-->>C: downstream result semantics
    end
```

### Responsibilities and behavior

1. The proxy starts one downstream server per proxy connection and reuses its
   MCP session for requests on that connection.
2. `tools/list` is forwarded to the downstream session; returned tool
   descriptors are passed through.
3. Before a policy decision, the proxy builds optional observation context and
   applies delegation/provenance processing only when configured.
4. A policy denial returns an MCP tool-level error without calling the
   downstream server. Policy evaluation exceptions are converted to denial.
5. On an allowed call, the proxy forwards the business arguments. A downstream
   result is returned without changing its content, structured content,
   `isError`, or metadata semantics.
6. Observation is opt-in. When enabled, denials and completed calls are
   recorded; a downstream timeout is recorded as a timeout/ambiguous outcome.

## Trust boundaries

- **Caller to proxy:** tool names and arguments are caller-controlled. Argument
  fields that resemble trust claims are not authoritative provenance.
- **Policy file:** policy configuration is supplied by the operator and
  strictly validated at startup. A missing or invalid policy must not silently
  disable enforcement.
- **Adapter:** model and provider responses are untrusted. They cannot override
  deterministic denials; parsing, timeout, provider, and unresolved failures
  become denials.
- **Proxy to downstream server:** the proxy controls whether a call crosses
  this boundary. A denied call does not cross it.
- **Downstream results:** tool output is external data. The provenance module
  classifies external values as untrusted unless an explicit trusted
  validation/transfer operation establishes otherwise.
- **Observation file:** logs contain metadata rather than raw tool argument
  values or results by default. Observation is diagnostic evidence, not an
  authorization authority.

## Important scope note

The architecture provides per-tool-call enforcement at the MCP boundary. It
does not reason about an agent's complete multi-step objective and does not
prove that a denied call prevented an end-to-end attack. Provenance transfer
between calls is a separate, bounded opt-in path requiring delegation
enforcement; it is not ambient taint propagation.

Related guides: [Policy Engine](policy-engine.md), [Provenance](provenance.md),
and [Evaluation](evaluation.md).
