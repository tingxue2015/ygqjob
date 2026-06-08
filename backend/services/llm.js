"use strict";

const LLM_API_KEY = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "";
const LLM_API_URL = process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions";
const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";
const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || "5000", 10);

const VALID_VALUES = {
  companyType: ["central", "local", "mixed"],
  recruitType: ["spring", "autumn", "makeup", "intern", "senior"],
  target: ["bachelor", "master", "phd", "overseas", "social"],
  location: ["beijing", "shanghai", "guangzhou", "shenzhen", "chengdu", "wuhan", "other"]
};

const SYSTEM_PROMPT = `You are a query parser for a Chinese state-owned enterprise job board. Parse natural language Chinese queries into structured filters. Output ONLY JSON, no other text. Fields: companyType (central/local/mixed/null), recruitType (spring/autumn/makeup/intern/senior/null), target (bachelor/master/phd/overseas/social/null), location (beijing/shanghai/guangzhou/shenzhen/chengdu/wuhan/other/null), keywords (array of 1-5 core search terms), company (specific company name if mentioned, else null). Example: {"companyType":"central","recruitType":null,"target":"master","location":"beijing","keywords":["computer","software"],"company":"State Grid"}`;

async function parseSearchQuery(query) {
  if (!LLM_API_KEY) {
    throw new Error("LLM_API_KEY not configured");
  }

  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, LLM_TIMEOUT_MS);

  try {
    var resp = await fetch(LLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + LLM_API_KEY
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query }
        ],
        temperature: 0,
        max_tokens: 300
      }),
      signal: controller.signal
    });

    if (!resp.ok) {
      var text = await resp.text().catch(function() { return ""; });
      throw new Error("LLM API error " + resp.status + ": " + text.slice(0, 200));
    }

    var data = await resp.json();
    var content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";

    var parsed;
    var jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("LLM response unparseable: " + content.slice(0, 100));
    }

    var filters = {};
    var filterKeys = Object.keys(VALID_VALUES);
    for (var i = 0; i < filterKeys.length; i++) {
      var key = filterKeys[i];
      var allowed = VALID_VALUES[key];
      if (parsed[key] && allowed.indexOf(parsed[key]) !== -1) {
        filters[key] = parsed[key];
      }
    }

    var keywords = [];
    if (Array.isArray(parsed.keywords)) {
      keywords = parsed.keywords.filter(function(k) {
        return typeof k === "string" && k.trim();
      }).map(function(k) {
        return k.trim();
      }).slice(0, 5);
    }

    return {
      filters: filters,
      keywords: keywords,
      company: typeof parsed.company === "string" ? parsed.company.trim() : null,
      raw: parsed
    };
  } finally {
    clearTimeout(timer);
  }
}

function isAvailable() {
  return !!LLM_API_KEY;
}

module.exports = { parseSearchQuery: parseSearchQuery, isAvailable: isAvailable };