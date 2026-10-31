"""Independent MCP stdio server for Agent44 Milestone 2 integration.

Provides three tools:
  - calculator: legitimate arithmetic operation.
  - read_document: retrieves a predefined harmless document.
  - restricted_operation: a tool intentionally denied by the example policy.

Run it via: python -m examples.calc_server
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from mcp.server.fastmcp import FastMCP


# Document content - harmless, predefined text
_DOCUMENT_CONTENT = """Agent44 Policy Documentation

This document describes the Agent44 security policy framework.

Version: 1.0
Effective: 2026-01-01

The policy engine enforces deterministic ALLOW/DENY decisions
before any downstream tool execution.

Core concepts:
- allow_tools: explicitly permitted tools
- deny_tools: explicitly prohibited tools
- argument rules: shape and content validation
- default_deny: all unspecified calls are denied

Security model:
- Hard-deny lists are authoritative
- Adapters may consult for UNDECIDED cases
- Fail-closed: errors and timeouts map to DENY"""

mcp = FastMCP(name="agent44-calc-demo", instructions="Simple demo tools for Agent44 integration")


@mcp.tool()
def calculator(a: int, b: int) -> int:
    """Return the sum of two integers.

    Args:
        a: First integer operand
        b: Second integer operand

    Returns:
        The sum of a + b
    """
    return a + b


@mcp.tool()
def read_document() -> str:
    """Return the predefined harmless document content.

    Returns:
        The full policy documentation text
    """
    return _DOCUMENT_CONTENT


@mcp.tool()
def restricted_operation(path: str) -> str:
    """Operation that is intentionally denied by the example policy.

    Args:
        path: File path argument (should be denied)

    Returns:
        Confirmation message (never reached when policy denies)
    """
    return f"Processed: {path}"


def main() -> None:
    """Run the calc server on stdio."""
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()