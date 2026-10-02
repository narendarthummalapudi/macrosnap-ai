"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firebase_applet_config_json_1 = __importDefault(require("../../firebase-applet-config.json"));
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)({
        projectId: firebase_applet_config_json_1.default.projectId,
    });
}
exports.adminAuth = (0, auth_1.getAuth)();
