// src/routes/restaurants.enrich.ts
import type { Request, Response } from "express";
import fetch from "node-fetch";
import { pool } from "../db"; // pg Pool z DATABASE_URL

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

// pomocnicze: OSM
async function geocodeOSM(q: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  const r = await fetch(url.toString(), { headers: { "User-Agent": "FreeFlow/1.0 (dev@test)" } });
  if (!r.ok) throw new Error("OSM HTTP " + r.status);
  const j: any[] = await r.json();
  if (!j.length) return null;
  const g = j[0];
  return {
    lat: parseFloat(g.lat),
    lng: parseFloat(g.lon),
    full_address: g.display_name,
    source: "osm" as const,
  };
}

// Google: Text Search → Place Details
async function enrichGoogle(query: string) {
  const ts = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  ts.searchParams.set("query", query);
  ts.searchParams.set("key", GOOGLE_KEY!);

  const r1 = await fetch(ts.toString());
  if (!r1.ok) throw new Error("Google TS HTTP " + r1.status);
  const j1: any = await r1.json();
  const hit = j1.results?.[0];
  if (!hit) return null;

  const placeId = hit.place_id as string;
  const details = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  details.searchParams.set("place_id", placeId);
  details.searchParams.set("fields", [
    "formatted_address",
    "url",
    "rating",
    "user_ratings_total",
    "geometry/location"
  ].join(","));
  details.searchParams.set("key", GOOGLE_KEY!);

  const r2 = await fetch(details.toString());
  if (!r2.ok) throw new Error("Google PD HTTP " + r2.status);
  const j2: any = await r2.json();
  const d = j2.result;
  if (!d) return null;

  return {
    place_id: placeId,
    full_address: d.formatted_address || hit.formatted_address,
    maps_url: d.url,
    rating: d.rating ?? hit.rating ?? null,
    ratings_total: d.user_ratings_total ?? hit.user_ratings_total ?? null,
    lat: d.geometry?.location?.lat ?? hit.geometry?.location?.lat ?? null,
    lng: d.geometry?.location?.lng ?? hit.geometry?.location?.lng ?? null,
    source: "google" as const,
  };
}

export async function enrichRestaurant(req: Request, res: Response) {
  try {
    const id = String(req.query.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing id" });

    const { rows } = await pool.query(
      "select id, name, city, full_address from public.restaurants where id = $1",
      [id]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: "Restaurant not found" });

    const qBase = [row.name, row.city].filter(Boolean).join(" ");
    let enriched: any = null;

    if (GOOGLE_KEY) {
      enriched = await enrichGoogle(qBase);
    }
    if (!enriched) {
      // fallback do OSM
      enriched = await geocodeOSM(qBase);
    }

    if (!enriched) return res.status(404).json({ error: "Nothing found" });

    // UPDATE DB
    const upd = await pool.query(
      `update public.restaurants
       set
         maps_place_id = coalesce($2, maps_place_id),
         maps_rating = $3,
         maps_ratings_total = $4,
         maps_url = coalesce($5, maps_url),
         full_address = coalesce($6, full_address),
         lat = coalesce($7, lat),
         lng = coalesce($8, lng),
         geocode_source = $9,
         geocoded_at = now(),
         enriched_at = now()
       where id = $1
       returning id, name, city, full_address, maps_place_id, maps_rating, maps_ratings_total, maps_url, lat, lng`,
      [
        id,
        enriched.place_id ?? null,
        enriched.rating ?? null,
        enriched.ratings_total ?? null,
        enriched.maps_url ?? null,
        enriched.full_address ?? null,
        enriched.lat ?? null,
        enriched.lng ?? null,
        enriched.source ?? null,
      ]
    );

    return res.json({ status: "OK", result: upd.rows[0] });
  } catch (e: any) {
    console.error("enrich error", e);
    return res.status(500).json({ error: e.message });
  }
}
