import { app } from "./app";

const PORT = process.env.PORT || 3000;

app.listen(PORT as any, "0.0.0.0", () => {
    console.log(`🚀 Decoupled MacroSnap Production Backend is running on port ${PORT}`);
});
