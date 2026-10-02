import { app } from "./app";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Decoupled MacroSnap Production Backend is running on port ${PORT}`);
});
