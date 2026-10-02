import { db } from './index';
import { users, meals } from './schema';
import { eq, desc } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(displayName ? { displayName } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database user upsert failed:", error);
    throw new Error("Failed to register or sync user profile in database.", { cause: error });
  }
}

export async function getUserMeals(uid: string) {
  try {
    return await db.select()
      .from(meals)
      .where(eq(meals.userId, uid))
      .orderBy(desc(meals.createdAt));
  } catch (error) {
    console.error("Database getUserMeals failed:", error);
    throw new Error("Failed to retrieve meals from database.", { cause: error });
  }
}

export async function createMeal(data: {
  mealId: string;
  userId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  notes?: string;
  searchGrounded?: boolean;
}) {
  try {
    const result = await db.insert(meals)
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
  } catch (error) {
    console.error("Database createMeal failed:", error);
    throw new Error("Failed to save meal record in database.", { cause: error });
  }
}

export async function deleteMeal(mealId: string, userId: string) {
  try {
    return await db.delete(meals)
      .where(eq(meals.mealId, mealId));
  } catch (error) {
    console.error("Database deleteMeal failed:", error);
    throw new Error("Failed to delete meal record from database.", { cause: error });
  }
}
