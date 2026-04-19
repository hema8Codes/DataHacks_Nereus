# Nereus Frontend

Next.js 14 + react-globe.gl + ElevenLabs Conversational AI widget + Recharts.
Talks to the Nereus FastAPI backend on `http://localhost:8000`.

## Setup

```bash
cd Nereus/frontend
cp .env.local.example .env.local      # contains agent ID + API base
npm install                            # ~1-2 min
npm run dev                            # http://localhost:3000
```

Make sure the backend is running at `http://localhost:8000` first.

## What you'll see

- A real Earth globe (blue marble texture) auto-rotating slowly
- 15 marine heatwave regions extruded as colored "heat blisters" on the ocean
- Top: a row of one-click event chips
- Right: floating side panel that opens when you click an event
- Bottom: voice button + text input bar (Nereus)

## Voice walkthrough

Click the 🎙 button. Browser asks for mic permission — grant it.
Try:

- "Show me the Pacific Blob"
- "Tell me about the Chile 2016 event"
- "Compare the Blob and Mediterranean 2022"
- "Generate a report on the North Atlantic 2023 event"
- "What was the climate state?"  (after one of the above)
- "Reset the view"

If voice is finicky, type the same questions into the text box.

## File map

```
src/
├── app/
│   ├── layout.tsx       Dark-mode root layout
│   ├── page.tsx         Main page  (globe + chips + side panel + voice)
│   └── globals.css      Tailwind base + scrollbar + pulse-ring
├── components/
│   ├── Globe.tsx        react-globe.gl wrapper, polygons + arcs + flyTo
│   ├── SidePanel.tsx    Event detail / Nereus answer / comparison view
│   └── VoiceWidget.tsx  ElevenLabs hook + 5 client tools + text fallback
├── lib/
│   └── api.ts           Typed client for the FastAPI backend
└── store.ts             Zustand: selected event, history, flyTo, comparison
```

## Tailwind palette
- `ink`     #0a0e15  — page background
- `panel`   #0f1620  — floating panels
- `border`  #1f2a36  — separators
- `deep`    #0B3D5C  — deep ocean
- `teal`    #117A8B  — accents
- `accent`  #E07A5F  — heat anomaly red
- `gold`    #C9A227  — secondary highlight

## Common hiccups

**Mic doesn't work** — Chrome blocks mic on `localhost` unless allowed. Click the lock
icon in the URL bar → allow microphone, then retry.

**`Module not found: react-globe.gl`** — first `npm install` failed silently. Re-run
`npm install` and watch for errors.

**Backend CORS error in console** — confirm the backend is running and
`NEXT_PUBLIC_API_BASE` matches its URL.

**`agent_...` not found** — paste your real ElevenLabs Agent ID into `.env.local`.
