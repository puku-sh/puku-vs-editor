"""
FastAPI-based Ollama-compatible proxy for Z.AI GLM models
Supports both chat completions and FIM (Fill-In-Middle) code completions
"""
import json
import os
import time
from typing import AsyncGenerator, Dict, List, Optional

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from starlette.datastructures import Address

app = FastAPI(title="GLM Coding Plan Proxy")

# Z.AI API configuration
ZAI_API_KEY = os.getenv("ZAI_API_KEY", "")
ZAI_BASE_URL = "https://api.z.ai/api/coding/paas/v4"

# Model definitions
MODELS = {
    "GLM-4.6": {
        "name": "GLM-4.6",
        "modified_at": "2024-11-16T00:00:00Z",
        "size": 0,
        "digest": "glm-4.6",
        "details": {
            "family": "glm",
            "parameter_size": "4.6B",
            "quantization_level": "Q4_0"
        }
    },
    "GLM-4.5": {
        "name": "GLM-4.5",
        "modified_at": "2024-11-16T00:00:00Z",
        "size": 0,
        "digest": "glm-4.5",
        "details": {
            "family": "glm",
            "parameter_size": "4.5B",
            "quantization_level": "Q4_0"
        }
    },
    "GLM-4.5-Air": {
        "name": "GLM-4.5-Air",
        "modified_at": "2024-11-16T00:00:00Z",
        "size": 0,
        "digest": "glm-4.5-air",
        "details": {
            "family": "glm",
            "parameter_size": "4.5B",
            "quantization_level": "Q4_0"
        }
    }
}


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "GLM Coding Plan proxy is ready."}


@app.get("/api/version")
async def get_version():
    """Ollama version endpoint - returns compatible version"""
    return {"version": "0.6.4"}


@app.get("/api/vendor")
async def get_vendor():
    """Vendor information endpoint"""
    return {"vendor": "ollama", "version": "1.0.0"}


@app.get("/api/tags")
async def list_models():
    """List available models - Ollama /api/tags format"""
    return {
        "models": [
            {
                "model": model_id,  # Ollama uses "model" not "name"
                "name": model_id,
                "modified_at": model_data["modified_at"],
                "size": model_data["size"],
                "digest": model_data["digest"],
                "details": model_data["details"]
            }
            for model_id, model_data in MODELS.items()
        ]
    }


@app.post("/api/show")
async def show_model(request: Request):
    """Show model details - Ollama /api/show format"""
    body = await request.json()
    model_name = body.get("name", "GLM-4.6")

    model_data = MODELS.get(model_name, MODELS["GLM-4.6"])

    # GLM-4.6 supports both tools and vision
    # GLM-4.5 and GLM-4.5-Air support tools only
    capabilities = ["tools"]
    if model_name == "GLM-4.6":
        capabilities.append("vision")

    return {
        "modelfile": f"# Modelfile for {model_name}",
        "parameters": "temperature 0.7\ntop_p 0.9",
        "template": "{{ .System }}\n{{ .Prompt }}",
        "details": model_data["details"],
        "capabilities": capabilities,  # Add capabilities array
        "model_info": {
            **model_data["details"],
            "general.architecture": "glm",
            "general.basename": model_name,
            "general.file_type": 2,
            "general.parameter_count": 4600000000,
            "general.quantization_version": 2,
            "glm.context_length": 128000,  # Use glm.context_length instead of llama
            "glm.embedding_length": 4096,
            "glm.attention.head_count": 32,
            "glm.feed_forward_length": 11008
        }
    }


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    """OpenAI-compatible chat completions endpoint"""
    client_address: Address = request.client
    print(f"[PROXY] Received chat completion request from {client_address}")

    body = await request.json()
    model = body.get("model", "GLM-4.6")
    stream = body.get("stream", False)
    messages = body.get("messages", [])

    print(f"[PROXY] Request body: model={model}, stream={stream}, messages={len(messages)} messages")
    print(f"[PROXY] Forwarding to {ZAI_BASE_URL}/chat/completions")

    # Forward to Z.AI
    headers = {
        "Authorization": f"Bearer {ZAI_API_KEY}",
        "Content-Type": "application/json"
    }

    # Map model names to Z.AI model names
    model_mapping = {
        "GLM-4.6": "GLM-4.6",
        "GLM-4.5": "GLM-4.5",
        "GLM-4.5-Air": "GLM-4.5-Air"
    }

    zai_model = model_mapping.get(model, "GLM-4.6")

    zai_request = {
        "model": zai_model,
        "messages": messages,
        "stream": stream,
        "temperature": body.get("temperature", 0.7),
        "max_tokens": body.get("max_tokens", 2048),
        "top_p": body.get("top_p", 1.0)
    }

    if stream:
        async def generate():
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{ZAI_BASE_URL}/chat/completions",
                    headers=headers,
                    json=zai_request
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            yield f"{line}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
    else:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ZAI_BASE_URL}/chat/completions",
                headers=headers,
                json=zai_request
            )
            response.raise_for_status()
            return response.json()


@app.post("/v1/completions")
@app.post("/v1/engines/{model}/completions")
async def code_completions(request: Request, model: str = "gpt-4o-copilot"):
    """
    GitHub Copilot-style FIM (Fill-In-Middle) completions endpoint
    Converts completion requests to chat format for Z.AI GLM models
    """
    client_address: Address = request.client

    body = await request.json()
    prompt = body.get("prompt", "")
    suffix = body.get("suffix", "")
    max_tokens = body.get("max_tokens", 500)
    temperature = body.get("temperature", 0.2)
    top_p = body.get("top_p", 1.0)
    stream = body.get("stream", True)

    print(f"[COMPLETIONS] Received request for model={model}, body keys: {list(body.keys())}")

    # Build FIM prompt for chat model
    if suffix:
        # FIM with suffix - use clear markers
        user_prompt = f"Complete the following code. Insert your completion between the CODE_BEFORE and CODE_AFTER sections.\n\n<CODE_BEFORE>\n{prompt}\n</CODE_BEFORE>\n\n<CODE_AFTER>\n{suffix}\n</CODE_AFTER>\n\nProvide ONLY the code completion, without any markdown formatting or explanations."
    else:
        # Simple code continuation
        user_prompt = f"Continue the following code:\n\n{prompt}\n\nProvide ONLY the code continuation, without any markdown formatting or explanations."

    system_prompt = (
        "You are an expert code completion assistant. "
        "Generate concise, contextually appropriate code completions. "
        "Return ONLY the code to be inserted, without markdown code blocks, explanations, or formatting."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    # Forward to Z.AI chat completions
    headers = {
        "Authorization": f"Bearer {ZAI_API_KEY}",
        "Content-Type": "application/json"
    }

    zai_request = {
        "model": "GLM-4.6",
        "messages": messages,
        "stream": stream,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "top_p": top_p
    }

    if stream:
        async def generate_completion_chunks():
            """Convert Z.AI streaming chat response to completion format"""
            first_chunk = True
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{ZAI_BASE_URL}/chat/completions",
                    headers=headers,
                    json=zai_request
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue

                        data = line[6:]  # Remove "data: " prefix

                        if data.strip() == "[DONE]":
                            yield "data: [DONE]\n\n"
                            break

                        try:
                            chunk = json.loads(data)
                            choices = chunk.get("choices", [])

                            for choice in choices:
                                content = choice.get("delta", {}).get("content", "")
                                if content:
                                    # Strip leading newlines/whitespace from first chunk only
                                    if first_chunk:
                                        content = content.lstrip('\n\r')
                                        first_chunk = False

                                    # Skip empty chunks after stripping
                                    if not content:
                                        continue

                                    # Convert to completion format
                                    completion_chunk = {
                                        "id": chunk.get("id"),
                                        "object": "text_completion",
                                        "created": chunk.get("created", int(time.time())),
                                        "model": model,
                                        "choices": [{
                                            "text": content,
                                            "index": choice.get("index", 0),
                                            "finish_reason": choice.get("finish_reason"),
                                            "logprobs": None
                                        }]
                                    }
                                    yield f"data: {json.dumps(completion_chunk)}\n\n"
                        except json.JSONDecodeError:
                            continue

        return StreamingResponse(generate_completion_chunks(), media_type="text/event-stream")
    else:
        # Non-streaming mode
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ZAI_BASE_URL}/chat/completions",
                headers=headers,
                json=zai_request
            )
            response.raise_for_status()
            chat_response = response.json()

            # Convert chat response to completion format
            choices = chat_response.get("choices", [])
            completion_choices = []

            for choice in choices:
                content = choice.get("message", {}).get("content", "")
                completion_choices.append({
                    "text": content,
                    "index": choice.get("index", 0),
                    "finish_reason": choice.get("finish_reason"),
                    "logprobs": None
                })

            return {
                "id": chat_response.get("id"),
                "object": "text_completion",
                "created": chat_response.get("created", int(time.time())),
                "model": model,
                "choices": completion_choices,
                "usage": chat_response.get("usage", {})
            }


if __name__ == "__main__":
    import uvicorn
    print("GLM Coding Plan proxy is ready.")
    uvicorn.run(app, host="127.0.0.1", port=11434)
