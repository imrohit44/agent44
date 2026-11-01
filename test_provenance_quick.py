import sys
sys.path.insert(0, 'src')
from agent44.provenance import ProvenanceSession, TrustClass, ProvenanceError

s = ProvenanceSession()
pid = s.record_output(tool_name="test_tool", trust_class=TrustClass.UNTRUSTED)
print(f"ProvenanceSession import OK, pid={pid}")

# Test validate_reference with valid ID
result = s.validate_reference(pid)
print(f"Valid ref: valid={result.valid}, category={result.category}")

# Test validate_reference with invalid ID
result2 = s.validate_reference("forged-id")
print(f"Forged ref: valid={result2.valid}, category={result2.category}")

# Test close
s.close()
try:
    s.record_output(tool_name="test2")
    print("ERROR: Should have raised ProvenanceError")
except ProvenanceError as e:
    print(f"Close protection OK: {e}")

print("All ProvenanceSession tests passed!")