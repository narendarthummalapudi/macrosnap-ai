"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const PORT = process.env.PORT || 3000;
app_1.app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Decoupled MacroSnap Production Backend is running on port ${PORT}`);
});
