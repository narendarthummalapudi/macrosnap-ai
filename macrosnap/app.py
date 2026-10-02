import json
import streamlit as st

from google import genai
from google.genai import types

from twilio.rest import Client as TwilioClient

from prompts import (
    SYSTEM_PROMPT,
    WELCOME_MESSAGE_TEMPLATE,
    SUMMARY_REQUEST_PROMPT
)

# Model configuration
MODEL_NAME = "gemini-2.5-flash"

# Configure Streamlit page
st.set_page_config(
    page_title="MacroSnap",
    page_icon="🥗",
    layout="centered"
)

# Streamlit custom styling for modern nutrition theme
st.markdown(
    """
    <style>
    .main-title {
        font-size: 2.2rem;
        font-weight: 800;
        color: #166534;
        margin-bottom: 0.2rem;
    }
    .subtitle {
        font-size: 1.1rem;
        color: #4b5563;
        margin-bottom: 1.5rem;
    }
    .logged-in-badge {
        display: inline-block;
        background-color: #dcfce7;
        color: #166534;
        padding: 0.35rem 0.85rem;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }
    .stButton>button {
        border-radius: 0.5rem;
        font-weight: 600;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# Read secrets safely with helpful message if missing
try:
    GEMINI_API_KEY = st.secrets["GEMINI_API_KEY"]
    TWILIO_ACCOUNT_SID = st.secrets["TWILIO_ACCOUNT_SID"]
    TWILIO_AUTH_TOKEN = st.secrets["TWILIO_AUTH_TOKEN"]
    TWILIO_WHATSAPP_FROM = st.secrets["TWILIO_WHATSAPP_FROM"]
    TWILIO_CONTENT_SID = st.secrets["TWILIO_CONTENT_SID"]
except Exception as e:
    st.error(
        "⚠️ Configuration missing in `.streamlit/secrets.toml`.\n\n"
        "Please create `.streamlit/secrets.toml` using `.streamlit/secrets.toml.example` as a template."
    )
    st.info("Required keys: GEMINI_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_CONTENT_SID")
    st.stop()


@st.cache_resource
def get_gemini_client():
    return genai.Client(api_key=GEMINI_API_KEY)


gemini_client = get_gemini_client()


@st.cache_resource
def get_twilio_client():
    return TwilioClient(
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN
    )


twilio_client = get_twilio_client()


def ask_gemini(parts):
    """Send parts (text and/or image) to the existing Gemini chat session."""
    try:
        response = st.session_state.chat.send_message(parts)
        return response.text
    except Exception as error:
        return f"Sorry, something went wrong: {error}"


def clean_whatsapp_text(text):
    """Clean and constrain text length for WhatsApp message templates."""
    if not text:
        return "No nutrition summary available."

    text = " ".join(text.split())

    if len(text) > 1500:
        return text[:1500] + "..."

    return text


def send_whatsapp(to_number, user_name, summary):
    """Send nutrition summary to user's WhatsApp using Twilio Content Template."""
    content_variables = json.dumps(
        {
            "1": user_name,
            "2": clean_whatsapp_text(summary)
        },
        ensure_ascii=False
    )

    message = twilio_client.messages.create(
        from_=TWILIO_WHATSAPP_FROM,
        to=f"whatsapp:{to_number}",
        content_sid=TWILIO_CONTENT_SID,
        content_variables=content_variables
    )

    return message.sid


def add_message(role, kind, content):
    """Append a message to the session state message history."""
    st.session_state.messages.append(
        {
            "role": role,
            "kind": kind,
            "content": content
        }
    )


def render_message(message):
    """Render a single message in the Streamlit UI."""
    role = message["role"]
    kind = message["kind"]
    content = message["content"]

    with st.chat_message(role):
        if kind == "image":
            st.image(content, caption="Uploaded Meal Photo", use_container_width=True)
        else:
            st.markdown(content)


# Initialize onboarding state if not present
if "onboarded" not in st.session_state:
    st.session_state.onboarded = False

# ==================================================
# ONBOARDING SCREEN
# ==================================================
if not st.session_state.onboarded:
    st.markdown('<div class="main-title">🥗 MacroSnap</div>', unsafe_allow_html=True)
    st.markdown('<div class="subtitle">"Snap it. Track it. Understand it."</div>', unsafe_allow_html=True)

    with st.form("onboarding_form", clear_on_submit=False):
        name_input = st.text_input("Your Name", placeholder="e.g. Alex Johnson")
        whatsapp_input = st.text_input("WhatsApp Number", placeholder="+91XXXXXXXXXX")
        submit_btn = st.form_submit_button("Let's Go 🚀", use_container_width=True)

        if submit_btn:
            name_clean = name_input.strip()
            whatsapp_clean = whatsapp_input.strip()

            if not name_clean or not whatsapp_clean:
                st.warning("Please fill in both your name and your WhatsApp number.")
            else:
                st.session_state.name = name_clean
                st.session_state.whatsapp_number = whatsapp_clean

                # Create the Gemini chat session with system instruction
                try:
                    st.session_state.chat = gemini_client.chats.create(
                        model=MODEL_NAME,
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_PROMPT
                        )
                    )
                except Exception as e:
                    st.error(f"Failed to initialize Gemini Chat session: {e}")
                    st.stop()

                st.session_state.messages = []
                st.session_state.onboarded = True
                st.rerun()

# ==================================================
# CHAT UI
# ==================================================
else:
    col_header, col_action = st.columns([3, 2])
    with col_header:
        st.markdown('<div class="main-title">🥗 MacroSnap</div>', unsafe_allow_html=True)
        st.markdown(
            f'<div class="logged-in-badge">👤 Logged in as: <strong>{st.session_state.name}</strong> ({st.session_state.whatsapp_number})</div>',
            unsafe_allow_html=True
        )

    # Check if user has actually interacted with the AI
    has_interacted = any(m["role"] == "assistant" for m in st.session_state.messages)

    with col_action:
        st.write("") # vertical spacing
        whatsapp_btn = st.button(
            "📤 Send to WhatsApp",
            disabled=not has_interacted,
            use_container_width=True,
            help="Send a WhatsApp-friendly nutrition summary of all meals discussed to your phone"
        )

    # Handle Send to WhatsApp button click
    if whatsapp_btn:
        with st.spinner("Preparing meal summary and sending to WhatsApp..."):
            try:
                # 1. Send SUMMARY_REQUEST_PROMPT to Gemini
                summary_text = ask_gemini(SUMMARY_REQUEST_PROMPT)

                # 2. Send the summary to Twilio
                send_whatsapp(
                    to_number=st.session_state.whatsapp_number,
                    user_name=st.session_state.name,
                    summary=summary_text
                )

                st.success("✅ Sent! Check your WhatsApp 📲")
                st.info(f"Summary sent to: {st.session_state.whatsapp_number}")

            except Exception as twilio_error:
                st.error("❌ Couldn't send the summary.")
                st.exception(twilio_error)

    st.divider()

    # Welcome message if no messages yet
    if not st.session_state.messages:
        welcome_text = WELCOME_MESSAGE_TEMPLATE.format(name=st.session_state.name)
        with st.chat_message("assistant"):
            st.markdown(welcome_text)

    # Render conversation history
    for msg in st.session_state.messages:
        render_message(msg)

    # Text and Image chat input
    # Handles:
    # A. Type only a question
    # B. Upload only an image
    # C. Upload an image and type a question
    user_input = st.chat_input(
        "Ask a question, or attach a photo of your meal",
        accept_file=True,
        file_type=["jpg", "jpeg", "png"]
    )

    if user_input:
        text_content = ""
        uploaded_files = []

        # Streamlit accept_file may return a dict or object depending on version
        if isinstance(user_input, dict):
            text_content = (user_input.get("text") or "").strip()
            uploaded_files = user_input.get("files") or []
        elif hasattr(user_input, "text"):
            text_content = (getattr(user_input, "text", "") or "").strip()
            uploaded_files = getattr(user_input, "files", []) or []
        else:
            text_content = str(user_input).strip()

        # Handle uploaded image if present
        if uploaded_files:
            photo = uploaded_files[0] if isinstance(uploaded_files, list) else uploaded_files
            photo_bytes = photo.getvalue() if hasattr(photo, "getvalue") else photo.read()

            # Record user image in message history
            add_message("user", "image", photo_bytes)
            with st.chat_message("user"):
                st.image(photo_bytes, caption="Uploaded Meal Photo", use_container_width=True)

            # Build Gemini parts
            gemini_parts = [
                types.Part.from_bytes(
                    data=photo_bytes,
                    mime_type=getattr(photo, "type", "image/jpeg")
                )
            ]

            if text_content:
                add_message("user", "text", text_content)
                with st.chat_message("user"):
                    st.markdown(text_content)
                gemini_parts.append(text_content)
            else:
                gemini_parts.append(
                    "What is this meal? Give me the estimated calories, protein, carbohydrates and fat."
                )

            with st.chat_message("assistant"):
                with st.spinner("Analyzing meal photo with Gemini Vision..."):
                    assistant_reply = ask_gemini(gemini_parts)
                    st.markdown(assistant_reply)
                    add_message("assistant", "text", assistant_reply)

        elif text_content:
            # Type only a question
            add_message("user", "text", text_content)
            with st.chat_message("user"):
                st.markdown(text_content)

            with st.chat_message("assistant"):
                with st.spinner("MacroSnap is thinking..."):
                    assistant_reply = ask_gemini(text_content)
                    st.markdown(assistant_reply)
                    add_message("assistant", "text", assistant_reply)
