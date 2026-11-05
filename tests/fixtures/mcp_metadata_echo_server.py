"""Local MCP server for verifying Agent44 metadata forwarding."""

from __future__ import annotations

from mcp import types
from mcp.server.lowlevel import Server
from mcp.server.stdio import stdio_server

server = Server("agent44-metadata-echo")


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
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
