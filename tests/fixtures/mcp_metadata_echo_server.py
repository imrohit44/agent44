"""Local MCP server for verifying Agent44 metadata forwarding."""

from __future__ import annotations

import argparse
import json

from mcp import types
from mcp.server.lowlevel import Server
from mcp.server.stdio import stdio_server

server = Server("agent44-metadata-echo")
call_log_path: str | None = None


@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="add",
            description="Add two integers.",
            inputSchema={
                "type": "object",
                "properties": {
                    "a": {"type": "integer"},
                    "b": {"type": "integer"},
                },
                "required": ["a", "b"],
            },
        ),
        types.Tool(
            name="echo",
            description="Echo a string and any provenance reference metadata.",
            inputSchema={
                "type": "object",
                "properties": {"message": {"type": "string"}},
                "required": ["message"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(
    name: str, arguments: dict[str, object]
) -> types.CallToolResult:
    if call_log_path is not None:
        with open(call_log_path, "a", encoding="utf-8") as call_log:
            call_log.write(json.dumps({"name": name, "arguments": arguments}) + "\n")

    request_meta = server.request_context.meta
    extra_meta = request_meta.model_extra if request_meta is not None else None
    provenance_reference = (
        extra_meta.get("provenanceReference")
        if isinstance(extra_meta, dict)
        else None
    )
    response_meta = (
        {"provenanceReference": provenance_reference}
        if isinstance(provenance_reference, dict)
        else None
    )

    if name == "add":
        text = str(int(arguments["a"]) + int(arguments["b"]))
    elif name == "echo":
        text = str(arguments["message"])
    else:
        raise ValueError(f"unknown tool: {name}")

    return types.CallToolResult(
        content=[types.TextContent(type="text", text=text)],
        _meta=response_meta,
    )


async def main() -> None:
    global call_log_path
    parser = argparse.ArgumentParser()
    parser.add_argument("--call-log")
    call_log_path = parser.parse_args().call_log

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
