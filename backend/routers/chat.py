from fastapi import APIRouter, HTTPException
from .. import schemas
from ..agent_manager import get_agent

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/", response_model=schemas.ChatMessage)
async def handle_chat_message(request: schemas.ChatRequest):
    """
    Receives the chat history and returns the AI's response using agentic AI.
    """
    agent_instance = get_agent()
    
    if not agent_instance:
        # Fallback to simulated response if agent is not available
        user_message = request.history[-1].content if request.history else ""
        ai_response_content = f"This is a fallback response to your message: '{user_message}'. Agentic AI is not available."
        return schemas.ChatMessage(role="ai", content=ai_response_content)
    
    try:
        # Extract the user's latest message from the chat history
        user_message = request.history[-1].content if request.history else ""
        
        if not user_message.strip():
            return schemas.ChatMessage(role="ai", content="I didn't receive a message. Please ask me something about the oceanographic data!")
        
        print(f"🤖 Processing query with agentic AI: {user_message}")
        
        # Process the query using the agentic AI
        result = await agent_instance.process_query(user_message)
        
        if result.get('success'):
            ai_response_content = result.get('response', 'I processed your query but couldn\'t generate a response.')
            print(f"✅ Agentic AI response generated successfully")
        else:
            error_msg = result.get('error', 'Unknown error occurred')
            ai_response_content = f"I encountered an error while processing your query: {error_msg}"
            print(f"❌ Agentic AI error: {error_msg}")
        
        return schemas.ChatMessage(role="ai", content=ai_response_content)
        
    except Exception as e:
        print(f"💥 Exception in chat handler: {str(e)}")
        ai_response_content = f"Sorry, I encountered an unexpected error: {str(e)}"
        return schemas.ChatMessage(role="ai", content=ai_response_content)