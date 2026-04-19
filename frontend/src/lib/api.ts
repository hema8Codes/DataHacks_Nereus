// Typed client for the Nereus backend.  Relies on NEXT_PUBLIC_API_BASE env var.

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function fetchGlobeData() {
  const r = await fetch(`${BASE}/api/globe-data`);
  if (!r.ok) throw new Error(`globe-data ${r.status}`);
  return r.json();
}

export async function fetchEvent(eventId: string) {
  const r = await fetch(`${BASE}/api/event/${encodeURIComponent(eventId)}`);
  if (!r.ok) throw new Error(`event ${r.status}`);
  return r.json();
}

export async function askNereus(
  question: string,
  selected_event_id?: string | null,
  conversation_history: { role: string; content: string }[] = [],
  language: string = "en",
) {
  const r = await fetch(`${BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, selected_event_id, conversation_history, language }),
  });
  if (!r.ok) throw new Error(`ask ${r.status}`);
  return r.json() as Promise<{
    answer: string;
    answer_en: string | null;
    sources: { id: string; title: string; type: string }[];
    suggested_event_id: string | null;
  }>;
}

export async function compareEvents(event_a: string, event_b: string) {
  const r = await fetch(`${BASE}/api/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_a, event_b }),
  });
  if (!r.ok) throw new Error(`compare ${r.status}`);
  return r.json();
}

export async function downloadReport(event_id?: string) {
  const scope = event_id ? "event" : "global";
  const qs = event_id ? `scope=event&event_id=${encodeURIComponent(event_id)}` : "scope=global";
  const url = `${BASE}/report?${qs}`;
  // trigger browser download
  const r = await fetch(url);
  const blob = await r.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `nereus_${event_id ?? "global"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
