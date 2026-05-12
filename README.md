# MORTIS — AI Lifespan Trajectory Simulator

MORTIS is an atmospheric AI-powered fictional lifespan trajectory simulator that analyzes user lifestyle patterns, routines, stress indicators, and behavioral habits to generate a cinematic mortality analysis experience.

This project is designed as:

* immersive entertainment
* psychological atmosphere
* emotional AI interaction
* cinematic web experience

MORTIS does **NOT** provide medical advice or real death predictions.

---

# Features

## Atmospheric Experience

* Cinematic graveyard-inspired UI
* Fog overlays and ambient effects
* Dark futuristic aesthetic
* Smooth animations and transitions
* Ambient sound design

## AI-Powered Analysis

* Emotional and behavioral observations
* Lifestyle trajectory analysis
* Personality archetypes
* Stress & recovery interpretation
* Fictional projected lifespan estimation

## Interactive Examination System

* One-question-at-a-time flow
* Adaptive follow-up questions
* Progress tracking
* Freeform AI-style responses
* Local session persistence

## Results System

* Cinematic results reveal
* Shareable result cards
* AI-generated observations
* Trajectory improvement suggestions
* Mobile-friendly sharing support

---

# Important Disclaimer

MORTIS is a fictional entertainment experience.

This project:

* does NOT provide medical advice
* does NOT diagnose conditions
* does NOT predict actual death dates
* should NOT be treated as scientific or professional guidance

All generated results are fictional simulations intended for entertainment and self-reflective purposes only.

---

# Tech Stack

## Frontend

* HTML
* CSS
* Vanilla JavaScript

## Backend

* Node.js
* Express.js

## AI

* Groq API

## Storage

* localStorage

## Deployment

* Vercel

---

# Installation

## Clone Repository

```bash
git clone YOUR_REPOSITORY_URL
cd mortis-ai
```

---

## Install Dependencies

```bash
npm install
```

---

## Create Environment File

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
PORT=3000
```

---

## Run Development Server

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

# Deployment (Vercel)

## Create `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

---

## Add Environment Variables

Inside Vercel dashboard:

Settings → Environment Variables

Add:

```txt
GROQ_API_KEY
```

---

# Project Structure

```txt
project/
│
├── public/
│   ├── css/
│   ├── js/
│   ├── sounds/
│   ├── assets/
│
├── views/
│
├── server.js
├── package.json
├── vercel.json
├── .env
├── .gitignore
└── README.md
```

---

# Future Improvements

* Enhanced AI behavioral analysis
* Improved cinematic transitions
* More personality archetypes
* Better mobile interactions
* Advanced result card customization
* Wellness trajectory companion system

---

# Philosophy

MORTIS is designed to feel less like a quiz and more like:

> an atmospheric AI oracle interpreting behavioral patterns and mortality trajectory.

The goal is emotional immersion, curiosity, atmosphere, and introspection — not fear.

---

# License

This project is for educational and entertainment purposes.

Please use responsibly.

---

# Created By

MORTIS.AI
