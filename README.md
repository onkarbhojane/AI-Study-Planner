# 📚 AI Study Planner App

A mobile application built using **React Native + Expo** that allows students to plan their studies with the help of **Google Gemini AI**.

---

## 🛠️ Setup Instructions

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/onkarbhojane/AI-Study-Planner.git
cd AI-Study-Planner
```

---

### 2️⃣ Install Dependencies

```bash
npm install
```

---

### 3️⃣ Add Your Gemini API Key

> ⚠️ Required for AI Planner to work

- Open the file:

```bash
app/components/AIPlanner.jsx
```

- Replace the placeholder with your actual [Gemini API key](https://makersuite.google.com/app/apikey):

```js
const GEMINI_API_KEY = "your-gemini-api-key-here";
```

---

### 4️⃣ Run the App

```bash
npx expo start
```

Use your terminal options or browser window to run the app on:
- Android Emulator / Expo Go
- iOS Simulator (macOS)
- Web Browser (press `w`)

---

## ✅ You’re ready to go!

This app will now use Gemini AI to help plan your study schedule through intelligent suggestions.
