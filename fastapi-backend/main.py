from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import goodfire
from goodfire import Client
from goodfire import Variant
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class TextProcessRequest(BaseModel):
    input_text: str
    variant: str

app = FastAPI()

# Configure CORS to allow requests from your Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Process text endpoint
@app.post("/api/process-text")
async def process_text(request: TextProcessRequest):
    # Load the variant from the variants directory
    variant_path = os.path.join("variants", f"{request.variant}.json")
    
    try:
        # Get API key from environment variables
        api_key = os.getenv("GOODFIRE_API_KEY")
        if not api_key:
            return {"status": "error", "message": "GOODFIRE_API_KEY not found in environment variables"}

        client = goodfire.Client(api_key=api_key)

        with open(variant_path, "r") as f:
            variant_json = json.load(f)
        
        loaded_variant = Variant.from_json(variant_json)

        response = client.chat.completions.create(
            messages=[
                {"role": "user", "content": request.input_text}
            ],
            model=loaded_variant,
            max_completion_tokens=500,
        )
        
        return {
            "status": "success",
            "response": response.choices[0].message['content']
        }
    except FileNotFoundError:
        return {"status": "error", "message": f"Variant file not found: {variant_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
