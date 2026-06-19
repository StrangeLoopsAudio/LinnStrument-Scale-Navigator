/**
 * Scale Navigator Bridge - Firestore to Max
 *
 * Polls a Firestore room document for tempo and harmonic state.
 * Sends data to Max for direct control of Scale Awareness (root_note + scale_name)
 
 * Replaces Scale Awareness Bridge for Firebase-connected workflows.
 * Uses Firestore REST API (no SDK required, public-read documents only).
 */

const Max = require('max-api');
const https = require('https');

// Configuration (set via Max messages)
let config = {
    projectId: 'scale-navigator-ensemble',
    roomCode: null,           // slug or document ID
    resolvedDocId: null,      // actual Firestore document ID
    pollInterval: 2000,       // ms
    enabled: false
};

// State
let lastScaleData = null;
let pollTimer = null;

// ---------------------------------------------------------------------------
// Firestore REST API
// ---------------------------------------------------------------------------

function buildFirestoreUrl(docId) {
    if (!docId) return null;
    return `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/rooms/${docId}`;
}

function buildQueryUrl() {
    return `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:runQuery`;
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject);
    });
}

function httpPost(url, body) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function resolveRoomId(slugOrId) {
    // 1. Try direct document ID lookup
    const directUrl = buildFirestoreUrl(slugOrId);
    const directRes = await httpGet(directUrl);
    if (directRes.status === 200) {
        return slugOrId;
    }

    // 2. Query by slug field
    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'rooms' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'roomName' },
                    op: 'EQUAL',
                    value: { stringValue: slugOrId }
                }
            },
            limit: 1
        }
    };
    const queryRes = await httpPost(buildQueryUrl(), queryBody);
    if (queryRes.status === 200) {
        try {
            const results = JSON.parse(queryRes.data);
            if (results.length > 0 && results[0].document) {
                // Extract doc ID from document name path
                const docName = results[0].document.name;
                const docId = docName.split('/').pop();
                return docId;
            }
        } catch (e) {
            // Query failed, fall through
        }
    }

    return null;
}

async function outputRoomNames() {
    // 2. Query by name field
    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'rooms' }]
        }
    };
    const queryRes = await httpPost(buildQueryUrl(), queryBody);
    if (queryRes.status === 200) {
        try {
            const results = JSON.parse(queryRes.data);
            const rooms = results.map(result => result.document.fields.roomName.stringValue);
            Max.post("Rooms: " + rooms);
            Max.outlet("rooms", ...rooms);
            return;
        } catch (e) {
            // Query failed, fall through
            Max.post("Errored when querying rooms");
        }
    }

    Max.post("No rooms found.");
}

async function fetchRoomDocument() {
    if (!config.roomCode) {
        throw new Error('No room code set');
    }

    // Resolve slug to doc ID on first call or if room changed
    if (!config.resolvedDocId) {
        config.resolvedDocId = await resolveRoomId(config.roomCode);
        if (!config.resolvedDocId) {
            throw new Error(`Room "${config.roomCode}" not found`);
        }
        Max.post(`Resolved room "${config.roomCode}" to doc ID "${config.resolvedDocId}"`);
    }

    const url = buildFirestoreUrl(config.resolvedDocId);
    const res = await httpGet(url);

    if (res.status === 200) {
        return JSON.parse(res.data);
    } else if (res.status === 404) {
        // Room was deleted? Clear cache and retry resolution next poll
        config.resolvedDocId = null;
        throw new Error(`Room "${config.roomCode}" not found`);
    } else {
        throw new Error(`HTTP ${res.status}`);
    }
}

/**
 * Extract a field value from Firestore REST response
 * Firestore wraps values: { "integerValue": "120" } or { "stringValue": "foo" }
 */
function extractFieldValue(field) {
    if (!field) return null;
    if (field.integerValue !== undefined) return parseInt(field.integerValue, 10);
    if (field.doubleValue !== undefined) return parseFloat(field.doubleValue);
    if (field.stringValue !== undefined) return field.stringValue;
    if (field.booleanValue !== undefined) return field.booleanValue;
    return null;
}

function extractScaleData(doc) {
    const fields = doc.fields;
    if (!fields || !fields.scaleData) return null;
    return extractFieldValue(fields.scaleData);
}

// ---------------------------------------------------------------------------
// Polling Logic
// ---------------------------------------------------------------------------

async function poll() {
    if (!config.enabled || !config.roomCode) return;

    try {
        const doc = await fetchRoomDocument();

        // --- Scale Data  ---
        const scaleData = extractScaleData(doc);
        if (scaleData !== null && scaleData !== lastScaleData) {
            lastScaleData = scaleData;
            Max.outlet('scale', scaleData);
        }

        //Max.outlet('status', 'connected');
    } catch (err) {
        Max.outlet('status', 'error');
        Max.post(`Error: ${err.message}`);
    }
}

function startPolling() {
    stopPolling();
    if (config.roomCode) {
        config.enabled = true;
        poll();  // Immediate first poll
        pollTimer = setInterval(poll, config.pollInterval);
        Max.post(`Polling room "${config.roomCode}" every ${config.pollInterval}ms`);
    }
}

function stopPolling() {
    config.enabled = false;
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    lastScaleData = null;
    Max.outlet('status', 'disconnected');
}

// ---------------------------------------------------------------------------
// Max Message Handlers
// ---------------------------------------------------------------------------

Max.addHandler('room', (roomCode) => {
    config.roomCode = roomCode;
    config.resolvedDocId = null;  // Clear cached doc ID for re-resolution
    Max.post(`Room code set to "${roomCode}"`);
    if (config.enabled) {
        startPolling();  // Restart with new room
    }
});

Max.addHandler('rooms', () => {
    Max.post(`Querying room names`);
    outputRoomNames();
});

Max.addHandler('project', (projectId) => {
    config.projectId = projectId;
    Max.post(`Project ID set to "${projectId}"`);
});

Max.addHandler('interval', (ms) => {
    config.pollInterval = Math.max(500, parseInt(ms, 10));  // Min 500ms
    Max.post(`Poll interval set to ${config.pollInterval}ms`);
    if (config.enabled) {
        startPolling();  // Restart with new interval
    }
});

Max.addHandler('connect', () => {
    if (!config.roomCode) {
        Max.post('Cannot connect: no room code set');
        Max.outlet('status', 'error');
        return;
    }
    startPolling();
});

Max.addHandler('disconnect', () => {
    stopPolling();
    Max.post('Disconnected');
});

// Manual poll (for testing)
Max.addHandler('poll', () => {
    poll();
});

// Report current config
Max.addHandler('info', () => {
    Max.post(`Config: room=${config.roomCode}, project=${config.projectId}, interval=${config.pollInterval}ms, enabled=${config.enabled}`);
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

Max.post('Firestore Bridge loaded');
Max.outlet('status', 'ready');
