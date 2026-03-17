import os
import sys

def check_env():
    print(f"Python Executable: {sys.executable}")
    print(f"Python Version: {sys.version}")
    
    packages = ['pandas', 'numpy', 'fastapi', 'pydantic', 'langchain', 'uvicorn', 'structlog']
    print("\n--- Package Audit ---")
    for pkg in packages:
        try:
            mod = __import__(pkg)
            print(f"[OK] {pkg} (version: {getattr(mod, '__version__', 'unknown')})")
        except ImportError:
            print(f"[MISSING] {pkg}")

if __name__ == "__main__":
    check_env()
