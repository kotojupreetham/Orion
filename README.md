# Orion — The Decision Engine for Changemakers

**NyxTutor** is a social entrepreneurship simulation platform built for **CodeNyx** at CVR College of Engineering. This module classifies new users into one of four experience levels so the simulation can adapt its difficulty and starting point.

## The 4 Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Explorer | Brand new, no prior exposure |
| 2 | Learner | Conceptual awareness, theory only |
| 3 | Builder | Some hands-on or practical experience |
| 4 | Catalyst | Real-world operational experience at scale |

## How Classification Works — 3 Signals

**Signal 1 — Prior Exposure** (0–3 pts): Structured dropdown — no involvement / volunteered / led one / ran multiple.

**Signal 2 — Functional Experience** (0–3 pts): Multi-select chips from 10 functional areas. Scored by count: 0 = 0pts, 1–3 = 1pt, 4–6 = 2pts, 7+ = 3pts.

**Signal 3 — Language Analysis** (1–3 pts): LLM reads the user's free-text story and returns a depth score + a specific insight.

**Total score → Level**: 0–1 = Level 1, 2–3 = Level 2, 4–6 = Level 3, 7–9 = Level 4.

## Getting Started

```bash
# Install dependencies
npm install

# Set up your environment
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the onboarding flow.

## Tech Stack

- [Next.js 16](https://nextjs.org/) with App Router
- [Tailwind CSS v4](https://tailwindcss.com/)
- [OpenAI API](https://platform.openai.com/) — `gpt-4o-mini` for language analysis
- TypeScript throughout
