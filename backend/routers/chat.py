from fastapi import APIRouter, HTTPException
from .. import schemas

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/", response_model=schemas.ChatMessage)
def handle_chat_message(request: schemas.ChatRequest):
    """
    Receives the chat history and returns the AI's response.
    For now, this is a simulated response from the backend.
    """
    # In the future, this is where you'll call the Gemini API
    # using the request.history as context.
    user_message = request.history[-1].content
    print(f"Received message from user: {user_message}")

    # Simulate a backend response
    ai_response_content = f"This is a real backend response to your message: '{user_message}'"

    return schemas.ChatMessage(role="ai", content=ai_response_content)