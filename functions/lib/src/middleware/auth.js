"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const firebase_admin_1 = require("../lib/firebase-admin");
const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const adminAuth = (0, firebase_admin_1.getAdminAuth)();
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
exports.requireAuth = requireAuth;
