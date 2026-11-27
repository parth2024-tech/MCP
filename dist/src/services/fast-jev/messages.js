"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compactMessages = compactMessages;
const client_js_1 = require("./client.js");
const compact_js_1 = require("./compact.js");
/** `compact` with a `JevClient` built from the options (key from `TYPESAFE_API_KEY` by default). */
function compactMessages(messages, options = {}) {
    return (0, compact_js_1.compact)(messages, new client_js_1.JevClient(options), options);
}
