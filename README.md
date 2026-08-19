# AI Voice Health Screening Web App

This is a real-time, voice-driven clinical screening intake web application. It features a React-based client dashboard and a Node.js backend. The app helps patients describe symptoms, collects operational intake details (Name, Chief Complaint, Onset & Duration, Severity, Associated Symptoms), and synthesizes them into structured summaries for providers.

The voice screening session is fully bilingual and supports adaptive, real-time speech interaction in both **English** and **Hindi (हिंदी)**.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React (TypeScript) + Vite + Tailwind CSS + Lucide Icons.
- **Backend**: Node.js + Express + WebSocket (`ws`).
- **Communication Protocol**: WebSockets for low-latency state synchronization and control signaling (connecting, text streaming, audio events).
- **Speech Processing Pipelines**:
  1. **Server-Side OpenAI Pipeline (Full Audio Transport)**:
     - **STT**: Capture mic stream chunks on the client -> transfer via WebSockets -> backend compiles to binary buffer -> OpenAI Whisper API transcribes.
     - **LLM**: GPT-4o-mini conducts the screening questions, maintaining state context across turns.
     - **TTS**: OpenAI TTS converts agent replies to speech files -> streamed back as Base64 MP3 chunks -> queued and played via browser Web Audio.
  2. **Hybrid Gemini & Browser Web Speech Pipeline (Fallback)**:
     - **STT**: Browser Web Speech API (`webkitSpeechRecognition`) transcribes voice locally.
     - **LLM**: Backend calls Google Gemini 2.0/1.5 Flash using the existing environment variables.
     - **TTS**: Browser native Speech Synthesis (`window.speechSynthesis`) renders speech locally.
     - *Advantages*: Zero external API latency for STT/TTS, and works out-of-the-box with **no OpenAI keys required**.

---

## ⚙️ Environment Configuration

The application loads environment files `.env` from:
1. The `server/` directory.
2. The project root directory.
3. The user's home directory (`~/.env`).

Create a `.env` in the `/server` folder containing the following keys:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key (Optional: Required for server-side Whisper/TTS pipeline)
```

---

## 🚀 Setup & Installation Instructions

### 1. Prerequisites
Ensure you have **Node.js v18.x or v20.x+** and **npm** installed.

### 2. Install Server Dependencies
```bash
cd server
npm install
```

### 3. Install Client Dependencies
```bash
cd ../client
npm install
```

### 4. Running the Servers

For development, start the backend first, followed by the client:

#### Start Node.js Server
From the `/server` directory:
```bash
npm run start
```
*Server will bind to `http://localhost:5000` and open WebSockets on `ws://localhost:5000`.*

#### Start React Client
From the `/client` directory:
```bash
npm run dev
```
*Client dashboard will open on `http://localhost:5173`.*

---

## 💡 Speaking Turn-Taking Control Modes

- **Push-to-Talk (PTT)**: Click and hold the microphone button to speak, and release it when done. This is highly stable, deliberate, and recommended for noisy environments.
- **Voice Activity Detection (VAD)**: Hands-free conversation mode. The browser Web Audio API tracks volume levels and triggers turn evaluation automatically after 1.5 seconds of silence.

---

## 📋 Evaluation Rubrics Addressed

1. **Bilingual Hindi/English**: Handles seamless input in English, Hindi, or mixing (Hinglish), and replies in the matched language.
2. **Audio Transport**: Uses real-time chunked WebSocket synchronization instead of single file upload ending.
3. **Clinical Context**: System prompt enforces progressive single-question updates (collecting: Name -> Symptom -> Duration -> Severity -> Secondary Symptoms) and requests clarification on vague responses.
4. **Structured JSON Reports**: Ends calls and extracts structured objects using clinical prompt schemas.
5. **Partial/Incomplete Calls**: Gracefully formats partial summaries using fallback markers instead of throwing errors.
