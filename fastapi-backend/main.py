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


class FeatureExtractionRequest(BaseModel):
    user_messages: list[dict]


@app.post("/api/feature-extraction")
async def feature_extraction(request: FeatureExtractionRequest):
    try:
        # Get API key from environment variables
        api_key = os.getenv("GOODFIRE_API_KEY")
        if not api_key:
            return {
                "status": "error",
                "message": "GOODFIRE_API_KEY not found in environment variables",
            }

        client = goodfire.Client(api_key=api_key)

        inspector = client.features.inspect(
            request.user_messages,
            model="meta-llama/Meta-Llama-3.1-8B-Instruct",
        )

        features_string = ""
        for activation in inspector.top(k=5):
            print(activation)
            features_string += f"label: {activation.feature.label}\tactivation: {activation.activation}\n"

        prompt = f"""
        You are a specialized tone classifier for conversations between users and their AI mentor. Your task is to analyze feature activations and return 1-3 tags (1-2 words each) that best represent the emotional and contextual tone of the interaction.

INPUT FORMAT:
The input will be a list of feature labels with their activation values in the following format:
label: [feature text]	activation: [activation value]
label: [feature text]	activation: [activation value]
...

PROCESS:
1. Carefully examine each feature label and its corresponding activation value
2. Consider features with higher activation values as more dominant in the conversation
3. Identify the primary themes, topics, and emotional qualities present
4. Focus on the relationship context (user-AI mentor interaction)

OUTPUT:
- Return between 1-3 tags (1-2 words each)
- Tags should capture the primary tones of the conversation
- Example tags: "analytical", "supportive", "technical", "educational", "reflective", "exploratory", "overwhelmed", "curious", "informational"


EXAMPLES:

Input:
label: Technical explanations of AI capabilities	activation: 0.85
label: User expressing confusion about concepts	activation: 0.65
label: Requests for clarification	activation: 0.43
label: Discussion of practical applications	activation: 0.38
label: Expression of curiosity	activation: 0.32

Output: ["technical", "educational", "clarifying"]

Input:
label: Discussions of psychological stress and feeling overwhelmed	activation: 0.87
label: User providing personal background information	activation: 0.56
label: Narrative descriptions of emotional struggles	activation: 0.51
label: Requesting coping strategies	activation: 0.48
label: Expression of gratitude	activation: 0.32

Output: ["supportive", "vulnerable"]

Input:
label: Discussion of known limitations and uncertainties of AI models	activation: 0.79
label: Consumer evaluation and comparison of options	activation: 0.65
label: User providing personal stats and background	activation: 0.41
label: Discussions of psychological stress	activation: 0.38
label: Narrative descriptions of emotional struggles	activation: 0.36

Output: ["analytical", "technical", "reflective"]


!!!IMPORTANT: ONLY OUTPUT THE LIST OF TAGS, NO OTHER TEXT OR FORMATTING.
!!!THE FORMAT SHOULD BE EXACTLY: ["tag1", "tag2", "tag3"]

---
Here is the list of features:
{features_string}
        """

        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="meta-llama/Meta-Llama-3.1-8B-Instruct",
            max_completion_tokens=500,
        )

        print(
            "DEBUG: Response from feature extraction",
            response.choices[0].message["content"],
        )

        return {
            "status": "success",
            "response": response.choices[0].message["content"],
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


# Process text endpoint
@app.post("/api/process-text")
async def process_text(request: TextProcessRequest):
    # Load the variant from the variants directory
    variant_path = os.path.join("variants", f"{request.variant}.json")

    try:
        # Get API key from environment variables
        api_key = os.getenv("GOODFIRE_API_KEY")
        if not api_key:
            return {
                "status": "error",
                "message": "GOODFIRE_API_KEY not found in environment variables",
            }

        client = goodfire.Client(api_key=api_key)

        with open(variant_path, "r") as f:
            variant_json = json.load(f)

        loaded_variant = Variant.from_json(variant_json)

        response = client.chat.completions.create(
            messages=[{"role": "user", "content": request.input_text}],
            model=loaded_variant,
            max_completion_tokens=500,
        )

        return {
            "status": "success",
            "response": response.choices[0].message["content"],
        }
    except FileNotFoundError:
        return {
            "status": "error",
            "message": f"Variant file not found: {variant_path}",
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
