import { pool } from "./backend/db.js";
const query = `
    SELECT
        gs.id AS session_id,
        ai.ai_interactions
    FROM game_sessions gs
    LEFT JOIN LATERAL (
        SELECT
            json_agg(
                json_build_object(
                    'question', ail.payload->>'prompt',
                    'response', ail.payload->>'response'
                )
            )::text AS ai_interactions
        FROM ai_interaction_logs ail
        WHERE ail.session_id = gs.id
    ) ai ON true
    LIMIT 5;
`;
pool.query(query).then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
}).catch(console.error);
