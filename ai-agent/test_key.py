
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Use override=True to be absolutely sure
load_dotenv(override=True)

api_key = os.getenv("GEMINI_API_KEY")
print(f"Testing key starting with: {api_key[:8]}... and ending with: ...{api_key[-4:]}")

genai.configure(api_key=api_key)

print("\n--- Listing Models ---")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print("FAILED to list models! Error:", str(e))

print("\n--- Testing Gemini 2.0 Flash ---")
try:
    model = genai.GenerativeModel('models/gemini-2.0-flash')
    response = model.generate_content("Say hello")
    print("SUCCESS! Response:", response.text)
except Exception as e:
    print("FAILED! Error:", str(e))
