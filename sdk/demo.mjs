/**
 * TrustPrism SDK Demo
 *
 * Run: node demo.mjs
 *
 * This simulates what a game developer would do after
 * installing @trustprism/sdk in their game project.
 */

import TrustPrism from "./src/index.js";

const API_KEY = "tp_dev_f116cdbb3c3c8960a9689358fc884bfbf52321689a82ddc1123eb5f59682a277";
const GAME_ID = "e75b3f36-d88d-4aef-9c68-da14be4ceea1";
const PARTICIPANT_ID = "3989bf59-8656-4b9f-a232-013e218cb610";

async function main() {
    console.log("🎮 TrustPrism SDK Demo\n");

    // ─── 1. Initialize ───
    console.log("1️⃣  Initializing SDK...");
    const tp = TrustPrism.init({
        apiKey: API_KEY,
        gameId: GAME_ID,
        baseUrl: "http://localhost:5000",
        debug: true
    });
    console.log("   ✅ SDK initialized\n");

    // ─── 2. Start Session ───
    console.log("2️⃣  Starting session...");
    const session = await tp.startSession({ participantId: PARTICIPANT_ID });
    console.log("   ✅ Session started:", session.sessionId);
    console.log("   📅 Started at:", session.startedAt, "\n");

    // ─── 3. Track Events ───
    console.log("3️⃣  Tracking events...");

    const event1 = await tp.trackEvent("level_started", {
        level: 1,
        difficulty: "medium"
    });
    console.log("   ✅ Tracked 'level_started':", event1.eventId);

    const event2 = await tp.trackEvent("hint_shown", {
        hint_type: "directional",
        ai_confidence: 0.85,
        player_position: { x: 100, y: 200 }
    });
    console.log("   ✅ Tracked 'hint_shown':", event2.eventId);

    const event3 = await tp.trackEvent("user_decision", {
        choice: "cooperate",
        reaction_time_ms: 2340,
        context: "prisoner_dilemma_round_3"
    });
    console.log("   ✅ Tracked 'user_decision':", event3.eventId, "\n");

    // ─── 4. AI Generate (will fail without real OpenAI key, that's expected) ───
    console.log("4️⃣  Testing AI proxy...");
    try {
        const ai = await tp.ai.generate({
            prompt: "The player is stuck on level 3. Give a subtle hint without spoilers.",
            systemPrompt: "You are a friendly game assistant. Keep hints vague and encouraging.",
            model: "gpt-4",
            temperature: 0.7,
            maxTokens: 100
        });
        console.log("   ✅ AI response:", ai.response);
        console.log("   📊 Usage:", ai.usage, "\n");
    } catch (err) {
        console.log("   ⚠️  AI proxy returned an error (expected if OPENAI_API_KEY is not set):");
        console.log("   ", err.message, "\n");
    }

    // ─── 5. End Session ───
    console.log("5️⃣  Ending session...");
    const end = await tp.endSession({ score: 1250 });
    console.log("   ✅ Session ended:", end.sessionId);
    console.log("   📅 Ended at:", end.endedAt);
    console.log("   🏆 Score:", end.score, "\n");

    // ─── Summary ───
    console.log("═══════════════════════════════════════");
    console.log("   🎉 Demo complete! Check your DB:");
    console.log("   • game_sessions — new session with score 1250");
    console.log("   • activity_logs — 3 tracked events");
    console.log("   • ai_interaction_logs — 1 AI call attempt");
    console.log("═══════════════════════════════════════");
}

main().catch(err => {
    console.error("❌ Demo failed:", err.message);
    process.exit(1);
});
