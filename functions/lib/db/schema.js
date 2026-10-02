"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mealsRelations = exports.usersRelations = exports.meals = exports.users = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
// Users table keyed by Firebase UID
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    uid: (0, pg_core_1.text)('uid').notNull().unique(), // Firebase Auth UID
    email: (0, pg_core_1.text)('email').notNull(),
    displayName: (0, pg_core_1.text)('display_name'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
// Meals table logged by users
exports.meals = (0, pg_core_1.pgTable)('meals', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    mealId: (0, pg_core_1.text)('meal_id').notNull().unique(),
    userId: (0, pg_core_1.text)('user_id').notNull(), // references users.uid
    name: (0, pg_core_1.text)('name').notNull(),
    calories: (0, pg_core_1.integer)('calories').notNull().default(0),
    protein: (0, pg_core_1.real)('protein').notNull().default(0),
    carbs: (0, pg_core_1.real)('carbs').notNull().default(0),
    fat: (0, pg_core_1.real)('fat').notNull().default(0),
    imageUrl: (0, pg_core_1.text)('image_url'),
    notes: (0, pg_core_1.text)('notes'),
    searchGrounded: (0, pg_core_1.boolean)('search_grounded').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
// Define relations
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    meals: many(exports.meals),
}));
exports.mealsRelations = (0, drizzle_orm_1.relations)(exports.meals, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.meals.userId],
        references: [exports.users.uid],
    }),
}));
