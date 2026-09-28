import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("soc.ai.gemini")

class GeminiClient:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"
        self._client = None
        self._init_client()

    def _init_client(self):
        if not self.api_key:
            logger.info("GEMINI_API_KEY not configured. AI investigation will report offline fallback.")
            return

        try:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
            logger.info("Google GenAI client initialized with model %s", self.model_name)
        except Exception as e:
            logger.error("Failed to initialize Google GenAI client: %s", str(e))
            self._client = None

    @property
    def is_available(self) -> bool:
        return self._client is not None and bool(self.api_key)

    async def generate_content(self, system_instruction: str, prompt: str) -> Optional[str]:
        if not self.is_available:
            self._init_client()
            if not self.is_available:
                return None

        try:
            from google.genai import types
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2, # Low temperature for accurate, grounded security analysis
                    max_output_tokens=2500,
                )
            )
            if response and response.text:
                return response.text.strip()
            return None
        except Exception as e:
            logger.error("Error invoking Gemini model %s: %s", self.model_name, str(e))
            return None

gemini_client = GeminiClient()
