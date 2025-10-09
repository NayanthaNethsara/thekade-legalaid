import pytest
from app.core.llm_client import LLMClient
from app.services.nlp_service import NLPService

# Initialize LLM client and NLP service
llm = LLMClient()
nlp = NLPService(llm)

# Test cases
test_messages = [
    {
        "text": "Remind me to call mom at 8",
        "expected_intent": "reminder"
    },
    {
        "text": "Finish the project report",
        "expected_intent": "todo"
    },
    {
        "text": "Meeting with client tomorrow at 10am",
        "expected_intent": "meeting"
    },
    {
        "text": "Remember that I like chocolate",
        "expected_intent": "note"
    },
    {
        "text": "What is the weather today?",
        "expected_intent": "question"
    },
    {
        "text": "Hello, how are you?",
        "expected_intent": "chat"
    }
]

@pytest.mark.parametrize("msg", test_messages)
def test_parse_message(msg):
    result = nlp.parse_message_rule(msg["text"])
    print(f"Input: {msg['text']}")
    print(f"Output: {result}\n")

    # Check intent
    assert result["intent"] == msg["expected_intent"]

    # If reminder or meeting, time should exist
    if result["intent"] in ["reminder", "meeting"]:
        assert result["time"] is not None

    # Action and raw should always exist
    assert "action" in result
    assert "raw" in result
