"use strict";

var express = require("express");
var router = express.Router();
var llm = require("../services/llm");

router.post("/parse", async function(req, res) {
  try {
    var query = req.body.query;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ error: "Query cannot be empty" });
    }

    var trimmedQuery = query.trim().slice(0, 200);

    if (!llm.isAvailable()) {
      return res.json({
        success: true,
        source: "fallback",
        filters: {},
        keywords: [trimmedQuery],
        company: null,
        message: "AI search not configured, using keyword match"
      });
    }

    try {
      var result = await llm.parseSearchQuery(trimmedQuery);
      return res.json({
        success: true,
        source: "ai",
        filters: result.filters,
        keywords: result.keywords,
        company: result.company,
        raw: result.raw
      });
    } catch (llmErr) {
      console.error("[search] LLM parse failed, fallback to keyword:", llmErr.message);
      return res.json({
        success: true,
        source: "fallback",
        filters: {},
        keywords: [trimmedQuery],
        company: null,
        message: "AI temporarily unavailable, using keyword match"
      });
    }
  } catch (err) {
    console.error("[search] Parse error:", err);
    res.status(500).json({ error: "Search parse failed" });
  }
});

router.get("/status", function(req, res) {
  res.json({
    available: llm.isAvailable(),
    model: process.env.LLM_MODEL || "gpt-4o-mini"
  });
});

module.exports = router;