"use client";

import { useEffect, useMemo, useRef } from "react";
import GlobeGL from "react-globe.gl";
import { useStore, GlobeEvent } from "@/store";

// Globe.tsx is itself loaded via next/dynamic(ssr:false) from page.tsx,
// so this file only ever executes client-side. That means we can import
// react-globe.gl synchronously here — which is required for refs to
// forward correctly to the underlying Three.js instance.

// Earth textures — served locally from public/textures/ (no CDN, no CORS)
const EARTH_IMG = "/textures/earth-blue-marble.jpg";
const EARTH_BUMP = "/textures/earth-topology.png";
const SKY_IMG = "/textures/night-sky.jpg";

function anomColor(anom: number) {
  if (anom >= 4.0) return "#ff2a1f";
  if (anom >= 3.0) return "#ff5f1f";
  if (anom >= 2.5) return "#ff8a1f";
  return "#ffbf1f";
}

/**
 * Canopy palette — brighter, more varied colors than anomColor so each region
 * reads as its own stained-glass panel when many are visible at once.
 * Severity still drives hue intensity; event_id lightly shifts the hue to
 * disambiguate overlapping regions (e.g. Blob phase 1 vs Blob phase 2 vs Blob 2019).
 */
function anomCanopy(anom: number, eventId: string) {
  // Base palette keyed on severity bands
  let base: [number, number, number];
  if (anom >= 4.0)      base = [255,  60,  90];   // hot magenta-red
  else if (anom >= 3.0) base = [255, 110,  60];   // coral-orange
  else if (anom >= 2.5) base = [255, 170,  70];   // amber
  else                  base = [255, 215, 100];   // warm yellow

  // Deterministic tiny hue shift from event_id so siblings vary
  let seed = 0;
  for (let i = 0; i < eventId.length; i++) seed = (seed * 31 + eventId.charCodeAt(i)) & 0xfff;
  const shiftR = ((seed      ) & 31) - 16;   // ±16
  const shiftG = ((seed >> 5 ) & 31) - 16;
  const shiftB = ((seed >> 10) & 31) - 16;

  const r = Math.max(40, Math.min(255, base[0] + shiftR));
  const g = Math.max(40, Math.min(255, base[1] + shiftG));
  const b = Math.max(40, Math.min(255, base[2] + shiftB));
  // return as 6-char hex so we can tack on an alpha byte like "ee"
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}

export default function Globe() {
  const events      = useStore((s) => s.events);
  const selected    = useStore((s) => s.selectedEventId);
  const flyTo       = useStore((s) => s.flyTo);
  const setFlyTo    = useStore((s) => s.setFlyTo);
  const comparison  = useStore((s) => s.comparison);
  const setSelected = useStore((s) => s.setSelectedEvent);

  const globeRef = useRef<any>(null);

  // Diagnostic: log when the globe ref actually captures the instance.
  useEffect(() => {
    const t = setInterval(() => {
      if (globeRef.current) {
        console.log("[globe] ref ready, methods:",
          Object.getOwnPropertyNames(Object.getPrototypeOf(globeRef.current))
            .filter(n => typeof globeRef.current[n] === "function").slice(0, 10));
        clearInterval(t);
      }
    }, 400);
    return () => clearInterval(t);
  }, []);

  // Markers (small glowing dot + ring at each event center)
  const rings = useMemo(() => events.map((e) => ({
    lat: e.lat_center,
    lng: e.lon_center,
    maxR: 3 + e.peak_anom_c,
    propagationSpeed: 1.5,
    repeatPeriod: 2200,
    color: anomColor(e.peak_anom_c),
    event_id: e.event_id,
  })), [events]);

  // Heat-blister polygons from bboxes.
  // IMPORTANT: three-globe/d3-geo treats polygon winding with the right-hand rule
  // on a sphere — a CCW ring (when viewed from outside) marks the *exterior*,
  // which makes a small bbox render as "whole globe minus the bbox". We want
  // the interior, so the ring must be wound CLOCKWISE (when viewed from outside).
  const polygons = useMemo(() => events.map((e) => ({
    properties: e,
    geometry: {
      type: "Polygon",
      coordinates: [[
        [e.lon_min, e.lat_min],
        [e.lon_min, e.lat_max],
        [e.lon_max, e.lat_max],
        [e.lon_max, e.lat_min],
        [e.lon_min, e.lat_min],
      ]],
    },
  })), [events]);

  // Labels floating above each canopy — altitude matches the polygon top + offset.
  // Depends on `selected` so when a polygon shoots up, its label lifts with it.
  const labels = useMemo(() => events.map((e) => {
    const isSel = selected === e.event_id;
    const polyTop = isSel ? 0.28 : (0.030 + e.peak_anom_c * 0.010);
    return {
      event_id: e.event_id,
      lat: e.lat_center,
      lng: e.lon_center,
      text: e.short_name.replace(/_/g, " ").toUpperCase(),
      subtext: `+${e.peak_anom_c}°C`,
      peak: e.peak_anom_c,
      selected: isSel,
      altitude: polyTop + 0.04,   // sits 0.04 above the polygon top
      color: isSel ? "#ffffff" : "#ffffffcc",
    };
  }), [events, selected]);

  const arcs = useMemo(() => {
    if (!comparison) return [];
    return [{
      startLat: comparison.event_a.lat_center,
      startLng: comparison.event_a.lon_center,
      endLat:   comparison.event_b.lat_center,
      endLng:   comparison.event_b.lon_center,
    }];
  }, [comparison]);

  // FlyTo: retries for up to 3 seconds until the globe ref is populated.
  // This handles the common race where setFlyTo fires before react-globe.gl
  // has finished its initial mount.
  useEffect(() => {
    if (!flyTo) return;
    let cancelled = false;
    let attempts = 0;
    const tryFly = () => {
      if (cancelled) return;
      const g = globeRef.current;
      if (g && typeof g.pointOfView === "function") {
        console.log("[globe] flying to", flyTo);
        // Disable auto-rotate right before the fly so it doesn't fight us
        const c = g.controls?.();
        if (c) c.autoRotate = false;
        g.pointOfView(
          { lat: flyTo.lat, lng: flyTo.lng, altitude: flyTo.altitude },
          1400,
        );
        return;
      }
      attempts++;
      if (attempts < 30) setTimeout(tryFly, 100); // retry for up to 3 s
      else console.warn("[globe] gave up waiting for globeRef");
    };
    tryFly();
    return () => { cancelled = true; };
  }, [flyTo]);

  // Separately manage autorotate + initial view (does NOT touch camera when a fly is in progress)
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls?.();
    if (controls) {
      controls.autoRotate = !selected && !comparison && !flyTo;
      controls.autoRotateSpeed = 0.25;
      controls.enableDamping = true;
      controls.dampingFactor = 0.12;
    }
  }, [selected, comparison, flyTo]);

  return (
    <div className="absolute inset-0"
         style={{
           // Subtly brighten + cool-tint the globe so oceans pop against the dark background
           filter: "brightness(1.18) saturate(1.12) contrast(1.05)",
         }}>
      <GlobeGL
        ref={globeRef}
        globeImageUrl={EARTH_IMG}
        backgroundColor="#0a0e15"
        atmosphereColor="#8fd8f5"
        atmosphereAltitude={0.32}
        showGlobe={true}
        showAtmosphere={true}

        // Bright stained-glass canopies at rest. Click = dramatic bloom + tall extrusion.
        polygonsData={polygons}
        polygonAltitude={(d: any) => {
          const sel = selected === d.properties.event_id;
          // Variation by severity at rest so worst regions sit slightly taller,
          // but all stay low enough to read as "floating canopies"
          const base = 0.030 + d.properties.peak_anom_c * 0.010;   // ~0.05-0.08
          return sel ? 0.28 : base;
        }}
        polygonCapColor={(d: any) => {
          const sel = selected === d.properties.event_id;
          const c = anomCanopy(d.properties.peak_anom_c, d.properties.event_id);
          // Selected: near-solid, bright. Resting: bright but translucent like stained glass.
          return sel ? c + "ee" : c + "82";  // "82" ≈ 51% alpha — glows but lets ocean show through
        }}
        polygonSideColor={(d: any) => {
          const sel = selected === d.properties.event_id;
          const c = anomCanopy(d.properties.peak_anom_c, d.properties.event_id);
          // Side walls drop off in opacity for that "suspended canopy" depth cue
          return sel ? c + "99" : c + "3a";
        }}
        polygonStrokeColor={(d: any) =>
          selected === d.properties.event_id
            ? "#ffffff"                      // solid bright outline on selected
            : "rgba(255,255,255,0.45)"       // crisp rim on each canopy
        }
        polygonLabel={(d: any) => `
          <div style="background:#0f1620;border:1px solid #1f2a36;padding:8px 10px;border-radius:6px;color:#eef2f6;font-family:system-ui;font-size:12px;min-width:180px">
            <div style="font-weight:600;color:${anomColor(d.properties.peak_anom_c)}">${d.properties.name}</div>
            <div style="opacity:0.75;margin-top:3px;font-size:11px">
              +${d.properties.peak_anom_c}&deg;C &middot; ${d.properties.category} &middot; ${d.properties.duration_days}d
            </div>
          </div>
        `}
        onPolygonClick={(d: any) => {
          const ev = d.properties as GlobeEvent;
          setSelected(ev.event_id);
          setFlyTo({ lat: ev.lat_center, lng: ev.lon_center, altitude: 1.3 });
        }}

        // Animated rings pulsing out from each event
        ringsData={rings}
        ringLat="lat"
        ringLng="lng"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringColor={(d: any) => (t: number) => {
          const c = d.color;
          // fade from full color to transparent
          const alpha = Math.floor((1 - t) * 255).toString(16).padStart(2, "0");
          return c + alpha;
        }}

        // Floating labels above each canopy — rise with the polygon when selected
        labelsData={labels}
        labelLat="lat"
        labelLng="lng"
        labelText={(d: any) => d.selected ? `${d.text}  ${d.subtext}` : d.text}
        labelSize={(d: any) => d.selected ? 0.95 : 0.42 + d.peak * 0.04}
        labelDotRadius={(d: any) => d.selected ? 0.55 : 0.22 + d.peak * 0.03}
        labelColor={(d: any) => d.color}
        labelResolution={4}
        labelAltitude={(d: any) => d.altitude}
        labelIncludeDot={true}
        labelTypeFace={undefined}

        // Comparison arc
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={() => ["#E07A5F", "#C9A227"]}
        arcDashLength={0.4}
        arcDashGap={2}
        arcDashAnimateTime={1800}
        arcStroke={0.7}
        arcAltitudeAutoScale={0.5}
      />
    </div>
  );
}
