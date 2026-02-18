/**
 * @trustprism/sdk
 *
 * SDK for integrating external games with the TrustPrism research platform.
 * Provides session management, event tracking, and AI proxy capabilities
 * with full audit logging on the TrustPrism backend.
 *
 * Usage:
 *   import TrustPrism from "@trustprism/sdk";
 *   const tp = TrustPrism.init({ apiKey: "tp_dev_...", gameId: "uuid" });
 *   const session = await tp.startSession({ participantId: "uuid" });
 *   await tp.trackEvent("hint_shown", { level: 3 });
 *   const ai = await tp.ai.generate({ prompt: "Help the player..." });
 *   await tp.endSession({ score: 42 });
 */

class TrustPrismSDK {
    #apiKey;
    #gameId;
    #baseUrl;
    #sessionId;
    #debug;

    /**
     * @param {Object} config
     * @param {string} config.apiKey    - Your TrustPrism API key (tp_dev_... or tp_prod_...)
     * @param {string} config.gameId    - UUID of your registered game
     * @param {string} [config.baseUrl] - TrustPrism backend URL (default: http://localhost:5000)
     * @param {boolean} [config.debug]  - Enable console logging (default: false)
     */
    constructor({ apiKey, gameId, baseUrl = "http://localhost:5000", debug = false }) {
        if (!apiKey) throw new Error("[TrustPrism] apiKey is required");
        if (!gameId) throw new Error("[TrustPrism] gameId is required");

        this.#apiKey = apiKey;
        this.#gameId = gameId;
        this.#baseUrl = baseUrl.replace(/\/$/, ""); // strip trailing slash
        this.#sessionId = null;
        this.#debug = debug;

        // Bind AI sub-object
        this.ai = {
            generate: this.#aiGenerate.bind(this)
        };

        this.#log("Initialized", { gameId, baseUrl });
    }

    // ==========================================
    //  SESSION MANAGEMENT
    // ==========================================

    /**
     * Start a new game session for a participant.
     * Must be called before trackEvent() or ai.generate().
     *
     * @param {Object} options
     * @param {string} options.participantId - UUID of the participant/player
     * @returns {Promise<{ sessionId: string, startedAt: string }>}
     */
    async startSession({ participantId }) {
        if (!participantId) throw new Error("[TrustPrism] participantId is required");

        const data = await this.#request("POST", "/api/telemetry/session/start", {
            participantId
        });

        this.#sessionId = data.sessionId;
        this.#log("Session started", data);
        return data;
    }

    /**
     * End the current game session.
     *
     * @param {Object} [options]
     * @param {number} [options.score] - Final score for this session
     * @returns {Promise<{ sessionId: string, endedAt: string, score?: number }>}
     */
    async endSession({ score } = {}) {
        this.#requireSession();

        const data = await this.#request("POST", "/api/telemetry/session/end", {
            sessionId: this.#sessionId,
            score
        });

        this.#log("Session ended", data);
        this.#sessionId = null;
        return data;
    }

    // ==========================================
    //  EVENT TRACKING
    // ==========================================

    /**
     * Track a game event. Writes to TrustPrism activity logs.
     *
     * @param {string} eventType - Event name (e.g. "hint_shown", "level_complete", "user_decision")
     * @param {Object} [data]    - Arbitrary event data to attach
     * @returns {Promise<{ eventId: string, trackedAt: string }>}
     */
    async trackEvent(eventType, data = {}) {
        if (!eventType) throw new Error("[TrustPrism] eventType is required");
        this.#requireSession();

        const result = await this.#request("POST", "/api/telemetry/track", {
            sessionId: this.#sessionId,
            eventType,
            data
        });

        this.#log(`Event tracked: ${eventType}`, result);
        return result;
    }

    // ==========================================
    //  AI PROXY
    // ==========================================

    /**
     * Generate an AI response through TrustPrism's proxy.
     * The prompt, response, latency, tokens, and cost are all logged server-side.
     *
     * @param {Object} options
     * @param {string} options.prompt         - The prompt text
     * @param {string} [options.systemPrompt] - System instruction for the LLM
     * @param {string} [options.model]        - LLM model (default: "gpt-4")
     * @param {string} [options.provider]     - LLM provider (default: "openai")
     * @param {number} [options.temperature]  - Sampling temperature (default: 0.7)
     * @param {number} [options.maxTokens]    - Max response tokens (default: 1024)
     * @param {Object} [options.metadata]     - Extra metadata to attach to the log
     * @returns {Promise<{ response: string, usage: Object, logId: string }>}
     */
    async #aiGenerate({
        prompt,
        systemPrompt,
        model = "gpt-4",
        provider = "openai",
        temperature = 0.7,
        maxTokens = 1024,
        metadata = {}
    }) {
        if (!prompt) throw new Error("[TrustPrism] prompt is required");
        this.#requireSession();

        const result = await this.#request("POST", "/api/ai/generate", {
            sessionId: this.#sessionId,
            prompt,
            systemPrompt,
            model,
            provider,
            temperature,
            maxTokens,
            metadata
        });

        this.#log("AI response received", {
            model,
            tokens: result.usage?.totalTokens,
            latencyMs: result.usage?.latencyMs
        });

        return result;
    }

    // ==========================================
    //  UTILITIES
    // ==========================================

    /**
     * Get the current session ID (or null if no session is active).
     */
    get sessionId() {
        return this.#sessionId;
    }

    /**
     * Check if a session is currently active.
     */
    get isSessionActive() {
        return this.#sessionId !== null;
    }

    // ==========================================
    //  INTERNAL HELPERS
    // ==========================================

    #requireSession() {
        if (!this.#sessionId) {
            throw new Error("[TrustPrism] No active session. Call startSession() first.");
        }
    }

    async #request(method, path, body) {
        const url = `${this.#baseUrl}${path}`;

        this.#log(`${method} ${path}`, body);

        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.#apiKey
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            let errorBody;
            try {
                errorBody = await response.json();
            } catch {
                errorBody = { error: await response.text() };
            }
            const errorMsg = errorBody.error || `HTTP ${response.status}`;
            throw new Error(`[TrustPrism] ${method} ${path} failed: ${errorMsg}`);
        }

        return response.json();
    }

    #log(message, data) {
        if (this.#debug) {
            console.log(`[TrustPrism] ${message}`, data || "");
        }
    }
}

/**
 * Factory method — the primary way to create a TrustPrism instance.
 *
 * @example
 * import TrustPrism from "@trustprism/sdk";
 * const tp = TrustPrism.init({ apiKey: "tp_dev_...", gameId: "uuid" });
 */
const TrustPrism = {
    init(config) {
        return new TrustPrismSDK(config);
    }
};

export default TrustPrism;
export { TrustPrismSDK };
