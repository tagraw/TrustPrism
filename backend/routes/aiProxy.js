import express from "express";
import { pool } from "../db.js";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";

const router = express.Router();

// All AI proxy routes require a valid API key
router.use(apiKeyAuth);

/**
 * POST /api/ai/generate
 *
 * Proxy AI request through TrustPrism with full audit logging.
 *
 * Flow:
 *   Game sends prompt → Backend logs prompt → Backend calls LLM →
 *   Backend logs response + cost → Returns result to game.
 *
 * Body: {
 *   sessionId,         // required - active game session
 *   prompt,            // required - the user/game prompt
 *   systemPrompt?,     // optional - system instruction
 *   model?,            // optional - default: "gpt-4"
 *   provider?,         // optional - default: "openai" (future: "anthropic", "google")
 *   temperature?,      // optional - default: 0.7
 *   maxTokens?,        // optional - default: 1024
 *   metadata?          // optional - arbitrary JSON the game wants to attach
 * }
 *
 * Returns: {
 *   response,          // AI text response
 *   usage: { promptTokens, completionTokens, totalTokens, latencyMs },
 *   logId              // ID of the ai_interaction_logs record
 * }
 */
router.post("/generate", async (req, res) => {
    const {
        sessionId,
        prompt,
        systemPrompt,
        model = "gemini-2.5-flash-lite",
        provider = "gemini",
        temperature = 0.7,
        maxTokens = 1024,
        metadata = {}
    } = req.body;

    const gameId = req.gameId;

    // Validate required fields
    if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
    }
    if (!prompt) {
        return res.status(400).json({ error: "prompt is required" });
    }

    // Verify session belongs to this game
    let participantId;
    try {
        const sessionCheck = await pool.query(
            `SELECT id, participant_id FROM game_sessions
             WHERE id = $1 AND game_id = $2`,
            [sessionId, gameId]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ error: "Session not found for this game" });
        }
        participantId = sessionCheck.rows[0].participant_id;
    } catch (err) {
        console.error("Session check error:", err);
        return res.status(500).json({ error: "Failed to verify session" });
    }

    // Build messages for the LLM call
    const messages = [];
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    // Call the LLM
    const startTime = Date.now();
    let aiResponse = null;
    let usage = null;
    let flagged = false;
    let flagReason = null;

    try {
        if (provider === "openai" || provider === "gemini") {
            const finalModel = model === "gpt-4" ? "gemini-2.5-flash-lite" : model;
            aiResponse = await callAI(messages, finalModel, temperature, maxTokens);
        } else {
            return res.status(400).json({ error: `Unsupported provider: ${provider}. Currently supported: gemini` });
        }
    } catch (err) {
        console.error("LLM call failed:", err);

        // Log the failed attempt
        await logInteraction(gameId, sessionId, participantId, {
            eventType: "ai_error",
            model,
            provider,
            prompt,
            response: null,
            latencyMs: Date.now() - startTime,
            promptTokens: 0,
            completionTokens: 0,
            flagged: true,
            flagReason: `LLM call failed: ${err.message}`,
            metadata
        });

        return res.status(502).json({ error: "AI provider call failed", details: err.message });
    }

    const latencyMs = Date.now() - startTime;

    // Extract usage from response
    usage = aiResponse.usage || {};
    const responseText = aiResponse.text;

    // Basic safety check — flag if response is empty or very short
    if (!responseText || responseText.trim().length < 2) {
        flagged = true;
        flagReason = "Empty or near-empty AI response";
    }

    // Log the full interaction to ai_interaction_logs
    let logId;
    try {
        logId = await logInteraction(gameId, sessionId, participantId, {
            eventType: "ai_suggestion",
            model,
            provider,
            modelVersion: aiResponse.model,
            prompt,
            response: responseText,
            latencyMs,
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            flagged,
            flagReason,
            metadata: {
                ...metadata,
                system_prompt: systemPrompt || null,
                temperature,
                max_tokens: maxTokens
            }
        });
    } catch (err) {
        console.error("Failed to log AI interaction:", err);
        // Don't fail the request — still return the AI response
    }

    res.json({
        response: responseText,
        usage: {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
            latencyMs
        },
        logId: logId || null
    });
});

/**
 * Call AI API (Supports Gemini via OpenAI-compatible endpoint)
 */
async function callAI(messages, model, temperature, maxTokens) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY not configured on the server");
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`AI API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
        text: choice?.message?.content || "",
        model: data.model,
        usage: data.usage || {}
    };
}

/**
 * Log an AI interaction to ai_interaction_logs
 */
async function logInteraction(gameId, sessionId, participantId, details) {
    const result = await pool.query(
        `INSERT INTO ai_interaction_logs (
            game_id, session_id, participant_id, event_type,
            ai_model, ai_provider, ai_model_version,
            prompt_tokens, completion_tokens, latency_ms,
            flagged, flag_reason,
            payload, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
            gameId,
            sessionId,
            participantId,
            details.eventType,
            details.model,
            details.provider,
            details.modelVersion || null,
            details.promptTokens,
            details.completionTokens,
            details.latencyMs,
            details.flagged || false,
            details.flagReason || null,
            {
                prompt: details.prompt,
                response: details.response
            },
            details.metadata || {}
        ]
    );

    return result.rows[0].id;
}

export default router;
