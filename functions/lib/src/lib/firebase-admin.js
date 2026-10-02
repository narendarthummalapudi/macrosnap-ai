"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminAuth = getAdminAuth;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firebase_applet_config_json_1 = __importDefault(require("../../firebase-applet-config.json"));
function getAdminAuth() {
    if (!(0, app_1.getApps)().length) {
        const projectId = process.env.FIREBASE_PROJECT_ID || firebase_applet_config_json_1.default.projectId;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : undefined;
        if (projectId && clientEmail && privateKey) {
            (0, app_1.initializeApp)({
                credential: (0, app_1.cert)({
                    projectId,
                    clientEmail,
                    privateKey
                })
            });
        }
        else {
            (0, app_1.initializeApp)({
                projectId: firebase_applet_config_json_1.default.projectId,
            });
        }
    }
    return (0, auth_1.getAuth)();
}
