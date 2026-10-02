# MacroSnap 🥗

AI Vision Nutrition Chatbot

> Snap it. Track it. Understand it.

MacroSnap is an intelligent AI nutrition buddy powered by Streamlit, Google Gemini Vision, and the Twilio WhatsApp API. It helps you understand what you're eating by estimating calories and macronutrients (protein, carbs, fat) from meal photos or text descriptions, maintains conversation context for follow-up questions, and sends a clean summary straight to your WhatsApp.

---

## Features

- 📸 **AI Food Image Recognition**: Snap or upload a photo of any meal or snack.
- 🔥 **Calorie Estimation**: Instant approximate energy breakdown in kcal.
- 💪 **Protein, Carbs & Fat Estimation**: Clear macro breakdown for tracking nutrition.
- 💬 **Text Chat**: Ask about recipes, restaurant menus, or ingredients.
- 🖼️ **Image Chat**: Upload images with or without accompanying questions.
- 🧠 **Conversation Memory**: Remembers past meals and follow-ups within the session.
- 📲 **WhatsApp Summary**: Summarizes all meals discussed and delivers it to your WhatsApp via Twilio.

---

## Tech Stack

- **Python**: 3.9+
- **Streamlit**: Interactive web UI and chat components
- **Google Gemini API (`google-genai`)**: Multimodal Vision (`gemini-2.5-flash`)
- **Twilio**: WhatsApp messaging API

---

## Project Structure

```
macrosnap/
│
├── app.py                     # Main Streamlit application
├── prompts.py                 # System and WhatsApp prompt templates
├── requirements.txt           # Python dependencies
├── .gitignore                 # Git ignore configuration
├── README.md                  # Project documentation
│
└── .streamlit/
    └── secrets.toml.example   # Template for API keys
```

---

## Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/your-username/macrosnap.git
cd macrosnap
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Requirements

```bash
pip install -r requirements.txt
```

### 4. Create Secrets File

Copy the example configuration:

```bash
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
```

### 5. Add API Keys

Open `.streamlit/secrets.toml` and fill in your credentials:

```toml
GEMINI_API_KEY = "your-actual-gemini-api-key"

TWILIO_ACCOUNT_SID = "your-actual-twilio-account-sid"
TWILIO_AUTH_TOKEN = "your-actual-twilio-auth-token"
TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886"
TWILIO_CONTENT_SID = "your-actual-content-template-sid"
```

> ⚠️ **IMPORTANT SECURITY NOTE**:  
> `.streamlit/secrets.toml` must **NEVER** be committed or uploaded to GitHub or public version control. It is already added to `.gitignore`.

### 6. Run the Application

```bash
streamlit run app.py
```

Open your browser at `http://localhost:8501`.

---

## License

MIT License. Free to use and customize!
