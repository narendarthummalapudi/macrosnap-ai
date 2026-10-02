"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("./app");
// Export the native Express app logic into a Serverless HTTP responder resolving under "/api"
exports.api = (0, https_1.onRequest)({ region: "us-central1" }, app_1.app);
