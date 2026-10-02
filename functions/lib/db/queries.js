"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateUser = getOrCreateUser;
exports.getUserMeals = getUserMeals;
exports.createMeal = createMeal;
exports.deleteMeal = deleteMeal;
const index_1 = require("./index");
const schema_1 = require("./schema");
const drizzle_orm_1 = require("drizzle-orm");
async function getOrCreateUser(uid, email, displayName) {
    try {
        const result = await index_1.db.insert(schema_1.users)
            .values({
            uid,
            email,
            displayName: displayName || null,
        })
            .onConflictDoUpdate({
            target: schema_1.users.uid,
            set: {
                email,
                ...(displayName ? { displayName } : {}),
            },
        })
            .returning();
        return result[0];
    }
    catch (error) {
        console.error("Database user upsert failed:", error);
        throw new Error("Failed to register or sync user profile in database.", { cause: error });
    }
}
async function getUserMeals(uid) {
    try {
        return await index_1.db.select()
            .from(schema_1.meals)
            .where((0, drizzle_orm_1.eq)(schema_1.meals.userId, uid))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.meals.createdAt));
    }
    catch (error) {
        console.error("Database getUserMeals failed:", error);
        throw new Error("Failed to retrieve meals from database.", { cause: error });
    }
}
async function createMeal(data) {
    try {
        const result = await index_1.db.insert(schema_1.meals)
            .values({
            mealId: data.mealId,
            userId: data.userId,
            name: data.name,
            calories: data.calories,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
            imageUrl: data.imageUrl || null,
            notes: data.notes || null,
            searchGrounded: !!data.searchGrounded,
        })
            .returning();
        return result[0];
    }
    catch (error) {
        console.error("Database createMeal failed:", error);
        throw new Error("Failed to save meal record in database.", { cause: error });
    }
}
async function deleteMeal(mealId, userId) {
    try {
        return await index_1.db.delete(schema_1.meals)
            .where((0, drizzle_orm_1.eq)(schema_1.meals.mealId, mealId));
    }
    catch (error) {
        console.error("Database deleteMeal failed:", error);
        throw new Error("Failed to delete meal record from database.", { cause: error });
    }
}
