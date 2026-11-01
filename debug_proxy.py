import sys
sys.path.insert(0, r"d:\Agent44\src")
from agent44.proxy import ProxyState
print("has provenance_session:", hasattr(ProxyState, "provenance_session"))
print("ProxyState annotations:", ProxyState.__annotations__)