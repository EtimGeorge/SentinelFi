
import sys
import os

print(f"Python Version: {sys.version}")
print(f"Current Path: {os.getcwd()}")

try:
    import pandas as pd
    import numpy as np
    import fastapi
    import pydantic
    import langchain
    import structlog
    from main import ChatRequest, ChatResponse, ForecastResponse, WBSItemBase
    
    # Test Pydantic model validation (Pydantic v2 style)
    req = ChatRequest.model_validate({
        "message": "Hello", 
        "session_id": "test", 
        "current_page_context": {"key": "value"},
        "history": []
    })
    print("ChatRequest validation: SUCCESS")
    
    resp = ChatResponse.model_validate({
        "response": "Hi",
        "session_id": "test"
    })
    print("ChatResponse validation: SUCCESS")
    
    print("ALL IMPORTS AND MODEL VALIDATIONS: SUCCESSFUL")
    sys.exit(0)
except Exception as e:
    print(f"DIAGNOSTIC FAILURE: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
