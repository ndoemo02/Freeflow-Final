import assert from "node:assert/strict";

const base = "http://localhost:5173";

(async () => {
  console.log("🔥 Frontend Smoke Test - Port 5173");
  console.log("=====================================");
  
  // Test głównej strony
  const r = await fetch(base);
  console.log("GET /", r.status);
  assert.equal(r.status, 200);
  
  // Test czy strona zawiera podstawowe elementy (React generuje HTML)
  const html = await r.text();
  assert.ok(html.includes("<!doctype html>"), "Strona powinna być HTML");
  assert.ok(html.includes("vite"), "Strona powinna być generowana przez Vite");
  
  // Test czy Vite dev server działa
  const r2 = await fetch(base + "/@vite/client");
  console.log("GET /@vite/client", r2.status);
  assert.ok([200, 404].includes(r2.status)); // Vite może nie mieć tego endpointu
  
  console.log("✅ Frontend smoke test passed!");
  process.exit(0);
})().catch((e) => { 
  console.error("❌ Frontend smoke test failed:", e); 
  process.exit(1); 
});
