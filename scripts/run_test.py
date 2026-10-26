#!/usr/bin/env python3
import sys
sys.path.insert(0, r"d:\Agent44")

import asyncio
import json
from pathlib import Path

# Minimal JsonlObserver replica
class JsonlObserver:
    def __init__(self, path):
        self.path = Path(path)

    @staticmethod
    def read_events(path):
        p = Path(path)
        if not p.exists():
            return []
        events = []
        with p.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    events.append(json.loads(line))
        return events

# Import test infrastructure
from tests.test_proxy import observing_proxy_session

async def run_test():
    # Test 1: DENY prevents downstream forwarding
    observe_path = Path(r"d:\Agent44/tests/obs_deny_test.jsonl")
    
    async with observing_proxy_session(observe_path) as session:
        denied_tool = "subtract"
        try:
            result = await session.call_tool(denied_tool, {})
        except Exception as e:
            print(f"Expected exception for denied call: {type(e).__name__}: {e}")
        
        events = JsonlObserver.read_events(observe_path)
        denied_events = [e for e in events if e.get("tool_name") == denied_tool]
        print(f"DENY events for '{denied_tool}': {len(denied_events)}")
        assert len(denied_events) == 0, f"DENY should prevent downstream forwarding, found {len(denied_events)} events"
        print("PASS: DENY prevents downstream forwarding")
    
    # Test 2: ALLOW control case - add tool should be forwarded
    add_observe_path = Path(r"d:\Agent44/tests/obs_allow_add.jsonl")
    
    async with observing_proxy_session(add_observe_path) as session_allow:
        result = await session_allow.call_tool("add", {"a": 2, "b": 3})
        texts = [c.text for c in result.content if c.type == "text"]
        print(f"ALLOW result for add: {texts}")
        assert result.isError is False, "ALLOW call should not be an error"
        assert texts == ["5"], f"Expected [5], got {texts}"
        print("PASS: ALLOW call succeeds with correct result")
    
    # Test 3: Verify ALLOW observation has forwarded=True
    add_events = JsonlObserver.read_events(add_observe_path)
    add_call_events = [e for e in add_events if e.get("tool_name") == "add"]
    print(f"ALLOW events for 'add': {len(add_call_events)}")
    assert len(add_call_events) == 1, f"Expected 1 observation for 'add', got {len(add_call_events)}"
    assert add_call_events[0].get("forwarded") is True, f"Expected forwarded=True, got {add_call_events[0].get('forwarded')}"
    print("PASS: ALLOW observation has forwarded=True")
    
    print("\nAll tests passed!")

if __name__ == "__main__":
    asyncio.run(run_test())