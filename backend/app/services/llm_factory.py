import os
import logging
from typing import Optional, Any, Tuple
from app.config import settings

logger = logging.getLogger(__name__)

def get_llm_client(
    provider: Optional[str] = None,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None
) -> Tuple[Optional[Any], str, str, str]:
    """
    Returns:
        (llm_instance, resolved_model, resolved_provider, status_message)
    """
    chosen_provider = (provider or settings.DEFAULT_PROVIDER or "gemini").lower().strip()
    
    # Check Gemini
    if chosen_provider in ["gemini", "google"]:
        gemini_key = (api_key or settings.GEMINI_API_KEY or "").strip()
        model = model_name or settings.DEFAULT_GEMINI_MODEL or "gemini-2.5-flash"
        
        if not gemini_key:
            return (
                None,
                model,
                "gemini",
                "No Gemini API key provided. Set GEMINI_API_KEY in backend/.env or enter it in the app UI."
            )
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=model,
                google_api_key=gemini_key,
                temperature=0.2,
                timeout=90,
            )
            return (llm, model, "gemini", f"Connected to Google Gemini ({model})")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini LLM: {e}")
            return (None, model, "gemini", f"Gemini initialization error: {str(e)}")

    # Check OpenAI
    if chosen_provider in ["openai", "gpt"]:
        openai_key = (api_key or settings.OPENAI_API_KEY or "").strip()
        model = model_name or settings.DEFAULT_OPENAI_MODEL or "gpt-4o-mini"
        
        if not openai_key:
            return (
                None,
                model,
                "openai",
                "No OpenAI API key provided. Set OPENAI_API_KEY in backend/.env or enter it in the app UI."
            )
        try:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(
                model=model,
                api_key=openai_key,
                temperature=0.2,
                timeout=90,
            )
            return (llm, model, "openai", f"Connected to OpenAI ({model})")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI LLM: {e}")
            return (None, model, "openai", f"OpenAI initialization error: {str(e)}")

    return (None, "none", chosen_provider, f"Unsupported provider: {chosen_provider}")

def get_llm(
    provider: Optional[str] = None,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None
) -> Optional[Any]:
    llm, _, _, _ = get_llm_client(provider, api_key, model_name)
    return llm
