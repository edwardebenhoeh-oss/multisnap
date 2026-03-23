export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

async function googleSearch(query) {
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=5`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items) return [];
    return data.items.map(item => ({ title: item.title, snippet: item.snippet }));
  } catch { return []; }
}

export async function POST(request) {
  try {
    const { imageBase64, mediaType, mode, label, highResBase64, tone, seoOptimize } = await request.json();

    if (mode === "detect") {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: `You are an expert resale appraiser scanning an image for items to sell.

Identify EVERY distinct item that could be individually resold. Scan the entire image carefully.

Include: furniture, electronics, clothing, shoes, bags, jewelry, watches, tools, artwork, mirrors, rugs, lamps, decor, plants, collectibles, books, instruments, kitchenware, bicycles, anything sellable.

Exclude: plain walls, floors, ceilings, windows, doors, sky, empty space.

For each item provide a tight bounding box as image fractions (0.0 to 1.0).

Return ONLY a valid JSON array, no markdown:
[
  {
    "label": "specific item name",
    "xFrac": 0.1,
    "yFrac": 0.05,
    "wFrac": 0.35,
    "hFrac": 0.45,
    "confidence": "high"
  }
]

Return between 1 and 10 items. Do not merge multiple items into one box.` }
          ]
        }]
      });
      const raw = response.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      const objects = JSON.parse(raw);
      return Response.json({ objects });
    }

    if (mode === "list") {
      const imageData = highResBase64 || imageBase64;

      const pass1 = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageData } },
            { type: "text", text: `You are a world-class resale appraiser. Identify this item with maximum precision.

Item label hint: "${label}" — but verify visually, do not trust this blindly.

Analyze every visual detail:
- Shape, proportions, colors, materials, finish
- Brand markings, logos, labels, model numbers, signatures
- Construction quality, joinery, hardware, stitching
- Style period, design era, manufacturer indicators
- Condition: wear, fading, damage, patina

Give 3 identifications from most to least specific.

Return ONLY valid JSON:
{
  "visualInventory": "detailed visual description",
  "brandMarkings": "any visible text, logos, labels or None visible",
  "pass1Identifications": [
    { "name": "most specific ID", "confidence": "high", "evidence": "visual evidence" },
    { "name": "second option", "confidence": "medium", "evidence": "evidence" },
    { "name": "third option", "confidence": "low", "evidence": "evidence" }
  ],
  "category": "furniture|electronics|clothing|art|collectible|plant|animal|other",
  "condition": "Excellent/Good/Fair/Poor — one sentence",
  "materials": "specific materials",
  "estimatedDimensions": "size estimate"
}` }
          ]
        }]
      });

      let pass1Data;
      try {
        pass1Data = JSON.parse(pass1.content.map(b => b.text||"").join("").replace(/```json|```/g,"").trim());
      } catch {
        pass1Data = { pass1Identifications:[{name:label,confidence:"medium",evidence:""}], category:"other", condition:"Unknown", materials:"Unknown", estimatedDimensions:"Unknown", visualInventory:"", brandMarkings:"None visible" };
      }

      const topId = pass1Data.pass1Identifications?.[0]?.name || label;
      const googleResults = await googleSearch(`${topId} resale price used`);
      const googleContext = googleResults.length > 0
        ? googleResults.map((r,i) => `${i+1}. ${r.title}: ${r.snippet}`).join("\n")
        : "No results found.";

      const toneGuide = tone === "fast" ? "Write casually and urgently — price it to sell fast, use direct language, short sentences." :
        tone === "profit" ? "Write professionally and thoroughly — emphasize quality and value to justify a higher price." :
        "Write clearly and honestly — balanced tone for a fair price.";

      const seoGuide = seoOptimize ? "Include relevant search keywords naturally in the title and first paragraph. Think about what buyers search for." : "";

      const pass2 = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageData } },
            { type: "text", text: `Verify and finalize this identification and generate a complete resale listing.

First pass ID: "${topId}"
Visual inventory: ${pass1Data.visualInventory}
Brand markings: ${pass1Data.brandMarkings}

Google market data:
${googleContext}

Listing tone: ${toneGuide}
${seoGuide}

EXAMPLE OF A GREAT LISTING:
Title: "West Elm Mid-Century Modern Walnut Nightstand — Excellent Condition"
Description: "Selling this beautiful West Elm mid-century modern nightstand in walnut finish. Features a single drawer with brass pull hardware and tapered legs. The perfect accent piece for any bedroom. Purchased for $299, asking $120. Dimensions approximately 22W x 16D x 24H inches. Local pickup only, no holds."

Now generate for this specific item. Use Google data to set realistic prices.

Return ONLY valid JSON:
{
  "identifications": [
    { "name": "final specific ID", "confidence": "high", "reasoning": "evidence" },
    { "name": "second", "confidence": "medium", "reasoning": "evidence" },
    { "name": "third", "confidence": "low", "reasoning": "evidence" }
  ],
  "confidenceScore": 85,
  "condition": "${pass1Data.condition}",
  "materials": "${pass1Data.materials}",
  "estimatedDimensions": "${pass1Data.estimatedDimensions}",
  "brandMarkings": "${pass1Data.brandMarkings}",
  "googleVerified": true,
  "tags": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "title": "compelling listing title under 80 chars",
  "priceMin": 25,
  "priceMax": 150,
  "priceSuggested": 75,
  "listing": "3-4 paragraph professional listing in the requested tone"
}` }
          ]
        }]
      });

      let result;
      try {
        result = JSON.parse(pass2.content.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim());
      } catch {
        result = {
          identifications:[{name:topId,confidence:"medium",reasoning:""}],
          confidenceScore:50, condition:pass1Data.condition, materials:pass1Data.materials,
          estimatedDimensions:pass1Data.estimatedDimensions, brandMarkings:pass1Data.brandMarkings,
          googleVerified:false, tags:[], title:label, priceMin:10, priceMax:50, priceSuggested:25,
          listing:"Unable to generate listing. Please edit manually."
        };
      }
      return Response.json(result);
    }

    if (mode === "rewrite") {
      const { currentListing, currentTitle, rewriteTone } = await request.json().catch(() => ({}));
      const toneGuide = rewriteTone === "fast" ? "Casual, urgent, price to sell fast." :
        rewriteTone === "profit" ? "Professional, detailed, justify higher price." : "Clear, honest, balanced.";

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Rewrite this resale listing with tone: ${toneGuide}

Current title: ${currentTitle}
Current listing: ${currentListing}

Return ONLY valid JSON:
{ "title": "new title", "listing": "new listing text" }`
        }]
      });
      const raw = response.content.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
      return Response.json(JSON.parse(raw));
    }

    return Response.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
