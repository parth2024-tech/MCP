"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MODEL = exports.SYSTEM_ONE_URL = void 0;
exports.buildJevRequest = buildJevRequest;
exports.parseJevResponse = parseJevResponse;
exports.noulAnswer = noulAnswer;
exports.SYSTEM_ONE_URL = 'https://api.typesafe.ai/v1/systemone';
exports.DEFAULT_MODEL = 'jev-latest';
/** The HTTP request for one Jev call, for any fetch-like transport. */
function buildJevRequest(params, state, questions) {
    return {
        url: params.baseUrl ?? exports.SYSTEM_ONE_URL,
        method: 'POST',
        headers: {
            authorization: `Bearer ${params.apiKey}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: params.model ?? exports.DEFAULT_MODEL,
            state,
            questions,
        }),
    };
}
/** Validates a Jev response body; throws on anything but an `answers` object. */
function parseJevResponse(status, ok, text) {
    if (!ok) {
        throw new Error(`Jev request failed (${status}): ${text.slice(0, 200)}`);
    }
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        throw new Error('Jev returned malformed JSON');
    }
    if (parsed === null ||
        typeof parsed !== 'object' ||
        !('answers' in parsed) ||
        parsed.answers === null ||
        typeof parsed.answers !== 'object') {
        throw new Error('Jev response is missing answers');
    }
    return parsed;
}
/** The `noul` probability of one answer; throws when it is not there. */
function noulAnswer(answers, name) {
    const answer = answers[name];
    if (!answer ||
        !('noul' in answer) ||
        typeof answer.noul !== 'number' ||
        !Number.isFinite(answer.noul)) {
        throw new Error(`Invalid Jev answer for ${name}`);
    }
    return answer.noul;
}
