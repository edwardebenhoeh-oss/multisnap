import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { imageBase64, mediaType, mode, label, highResBase64 } = await request.json();

    if (mode === "detect") {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: `You are an expert appraiser and identifier scanning an image for anything worth identifying or listing.

Identify EVERY distinct subject in the image that could be identified, listed, sold, adopted, or is otherwise interesting. Be thorough and scan the entire image carefully.

Include absolutely anything visible such as:
- Furniture, decor, lamps, rugs, mirrors, artwork, frames
- Electronics, appliances, gadgets, cables, accessories
- Clothing, shoes, bags, hats, jewelry, watches
- Tools, hardware, sporting goods, outdoor equipment
- Plants (any species, potted or growing), flowers, trees
- Animals (pets, wildlife, birds, any creature visible)
- Toys, games, collectibles, books, instruments
- Food items, kitchenware, cookware
- Vehicles, bicycles, parts
- Anything else that has a name and could be identified

Only exclude: plain walls, floors, ceilings, windows, doors, sky, and empty space.

For each subject provide a tight bounding box as image fractions (0.0 to 1.0).

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "label": "specific descriptive label (e.g. potted fiddle leaf fig, golden retriever, vintage table lamp)",
    "xFrac": 0.1,
    "yFrac": 0.05,
    "wFrac": 0.35,
    "hFrac": 0.45,
    "confidence": "high"
  }
]

Be thorough. Return between 1 and 10 subjects. Do not merge multiple distinct subjects into one box.` }
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
            { type: "text", text: `You are a world-class expert identifier and appraiser. Your goal is to identify this item as specifically and accurately as possible.

The item label provided is: "${label}" but do NOT rely on this label. Look at the image with fresh eyes.

IDENTIFICATION METHODOLOGY:

1. VISUAL INVENTORY: List every visual detail you can see including shape, proportions, colors, materials, hardware, markings, logos, labels, signatures, wear patterns, construction method, style indicators.

2. CATEGORY-SPECIFIC ANALYSIS:
- FURNITURE: leg style, joinery, hardware era, wood species, upholstery, style period, likely manufacturer
- PLANTS: leaf shape, venation, stem structure, growth habit, pot type, species, variety, estimated age
- ANIMALS: coat pattern, body structure, facial features, ear shape, tail, species, breed, age estimate
- ELECTRONICS: form factor, port types, brand markings, design era, model indicators
- ARTWORK: medium, subject matter, style, any signature or markings, frame type
- CLOTHING: cut, construction, fabric, era, brand indicators
- COLLECTIBLES: type, era, makers marks, rarity indicators

3. BRAND/MAKER DETECTION: Look extremely carefully for any text, logos, labels, makers marks, or signatures even partial ones.

4. Give the 3 most specific identifications from most to least likely.

Return ONLY valid JSON:
{
  "visualInventory": "Detailed inventory of every visual detail observed",
  "brandMarkings": "Exact description of any text, logos, labels, or marks visible, or None visible",
  "pass1Identifications": [
    { "name": "Most specific identification", "confidence": "high", "evidence": "specific visual features" },
    { "name": "Second possibility", "confidence": "medium", "evidence": "supporting features" },
    { "name": "Third possibility", "confidence": "low", "evidence": "supporting features" }
  ],
  "category": "furniture|plant|animal|electronics|clothing|art|collectible|other",
  "condition": "Excellent/Good/Fair/Poor with explanation",
  "materials": "Specific materials identified",
  "estimatedDimensions": "Size estimate based on proportions"
}` }
          ]
        }]
      });

      let pass1Data;
      try {
        const raw1 = pass1.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
        pass1Data = JSON.parse(raw1);
      } catch {
        pass1Data = {
          pass1Identifications: [{ name: label, confidence: "medium", evidence: "Unable to parse" }],
          category: "other", condition: "Unknown", materials: "Unknown",
          estimatedDimensions: "Unknown", visualInventory: "", brandMarkings: "None visible"
        };
      }

      const pass2 = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageData } },
            { type: "text", text: `You are verifying and finalizing an identification. A first analysis identified this item as: "${pass1Data.pass1Identifications?.[0]?.name || label}"

Visual inventory from first pass: ${pass1Data.visualInventory}
Brand markings found: ${pass1Data.brandMarkings}

YOUR TASK:
1. Look at the image again with the first identification in mind
2. Either CONFIRM it if the evidence strongly supports it or CORRECT it if you see something the first pass missed
3. Assign a final confidence score 0-100
4. Generate pricing based on current resale market (Facebook Marketplace, eBay sold listings, OfferUp)
5. Write a compelling accurate listing

Pricing guidelines by category:
- Furniture: 20-35% of retail, weighted by brand and condition
- Plants: nursery retail value based on size and rarity
- Animals: breed-appropriate adoption or sale value
- Electronics: 30-50% of retail depending on age and condition
- Art: base on medium, size, artist recognition
- Clothing: 10-25% of retail unless designer or vintage
- Collectibles: research comparable sold listings

Return ONLY valid JSON:
{
  "identifications": [
    { "name": "Final most specific identification", "confidence": "high", "reasoning": "combined evidence from both passes" },
    { "name": "Second possibility", "confidence": "medium", "reasoning": "evidence" },
    { "name": "Third possibility", "confidence": "low", "reasoning": "evidence" }
  ],
  "confidenceScore": 85,
  "condition": "${pass1Data.condition}",
  "materials": "${pass1Data.materials}",
  "estimatedDimensions": "${pass1Data.estimatedDimensions}",
  "brandMarkings": "${pass1Data.brandMarkings}",
  "title": "Accurate compelling listing title under 80 chars",
  "priceMin": 25,
  "priceMax": 150,
  "priceSuggested": 75,
  "listing": "4 paragraph professional listing. Para 1: precise identification and standout features. Para 2: materials, construction, breed or species details, or model specifics. Para 3: honest condition assessment with any flaws noted. Para 4: dimensions estimate and relevant care or logistics info."
}` }
          ]
        }]
      });

      let result;
      try {
        const raw2 = pass2.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
        result = JSON.parse(raw2);
      } catch {
        result = {
          identifications: pass1Data.pass1Identifications?.map(i => ({ name: i.name, confidence: i.confidence, reasoning: i.evidence })) || [{ name: label, confidence: "medium", reasoning: "Parse error" }],
          confidenceScore: 50,
          condition: pass1Data.condition,
          materials: pass1Data.materials,
          estimatedDimensions: pass1Data.estimatedDimensions,
          brandMarkings: pass1Data.brandMarkings,
          title: label,
          priceMin: 10, priceMax: 50, priceSuggested: 25,
          listing: "Unable to generate listing. Please edit manually."
        };
      }

      return Response.json(result);
    }

    return Response.json({ error: "Invalid mode" }, { status: 400 });

  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}