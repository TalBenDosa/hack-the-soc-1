
import { PointsActivity, UserProgress, TenantUser, User } from '@/entities/all';

// Point values for different activities
const pointsConfig = { // Renamed from POINTS_SYSTEM
  scenario_completed: {
    base_points: 100,
    difficulty_multiplier: { Easy: 1.0, Medium: 1.2, Hard: 1.5, Advanced: 2.0 },
    perfect_score_bonus: 50
  },
  quiz_completed: {
    base_points: 50,
    difficulty_multiplier: { Beginner: 1.0, Intermediate: 1.2, Advanced: 1.5 },
    perfect_score_bonus: 25
  },
  lesson_completed: {
    base_points: 30,
    difficulty_multiplier: { Beginner: 1.0, Intermediate: 1.2, Advanced: 1.5 }
  },
  // New SIEM Learning Path activities
  siem_theory_lesson_completed: {
    base_points: 40,
    difficulty_multiplier: { Beginner: 1.0, Intermediate: 1.2, Advanced: 1.5 }
  },
  siem_exercise_completed: {
    base_points: 75,
    difficulty_multiplier: { Easy: 1.0, Medium: 1.2, Hard: 1.5, Advanced: 2.0 },
    score_multiplier: true, // Multiply by (score/100)
    perfect_score_bonus: 25
  },
  siem_phase_completed: {
    base_points: 200, // Bonus for completing entire phase
    phase_multiplier: { 1: 1.0, 2: 1.5 } // Theory phase vs Practice phase
  },
  // Existing activities (if needed, ensure they fit the structure)
  first_login: { base_points: 25 },
  daily_streak: { base_points: 10, max_streak_bonus: 100 },
  achievement_unlocked: { base_points: 50 }
};

// Level thresholds
const levelThresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000]; // Renamed from LEVEL_THRESHOLDS

/**
 * Helper function to calculate user's level and points to the next level based on total points.
 * @param {number} totalPoints - The user's total points.
 * @returns {{level: number, pointsToNext: number}} The calculated level and points needed for the next level.
 */
const getLevelFromPoints = (totalPoints) => { // Renamed from calculateLevel
  let level = 1;
  while (level < levelThresholds.length && totalPoints >= levelThresholds[level]) {
    level++;
  }
  let pointsToNext = 0;
  if (level < levelThresholds.length) {
    pointsToNext = levelThresholds[level] - totalPoints;
  }
  return { level, pointsToNext };
};

/**
 * Helper function to retrieve user's tenant context.
 * @param {string} userId - The user's ID.
 * @returns {Promise<{tenantId: string}>} The tenant ID.
 * @throws {Error} If tenant context cannot be determined.
 */
async function getTenantContext(userId) { // Renamed from getUserTenantContext
  let tenantId = null;

  // Strategy A: Try localStorage first (fastest)
  const tenantContextString = localStorage.getItem('tenant_context');
  if (tenantContextString) {
    try {
      const tenantContext = JSON.parse(tenantContextString);
      tenantId = tenantContext.tenant_id;
    } catch (parseError) {
      console.warn(`[Gamification] Failed to parse tenant context from localStorage: ${parseError.message}`);
    }
  }

  // Strategy B: Fallback to querying TenantUser if localStorage fails
  if (!tenantId) {
    console.warn(`[Gamification] Tenant context not in localStorage for user ${userId}. Falling back to DB query.`);
    if (TenantUser && typeof TenantUser.filter === 'function') {
      const tenantUsers = await TenantUser.filter({ user_id: userId, status: 'active' });
      if (tenantUsers && tenantUsers.length > 0) {
        tenantId = tenantUsers[0].tenant_id;
        console.log(`[Gamification] Tenant context found via DB query: ${tenantId}`);
        // Optional: Re-set localStorage for this session to speed up subsequent calls
        localStorage.setItem('tenant_context', JSON.stringify({ tenant_id: tenantId }));
      }
    }
  }

  // Final Check: If no tenantId is found after all strategies, then it's a critical error.
  if (!tenantId) {
    throw new Error("[Gamification Service CRITICAL ERROR] - Could not determine tenant context for user.");
  }
  return { tenantId };
}

/**
 * Updates a user's progress record, handling point accumulation, level calculation,
 * and specific activity counters. This is the central function for modifying UserProgress.
 * @param {string} userId - The user's ID.
 * @param {string} activityType - The type of activity (e.g., 'quiz_completed', 'scenario_completed', 'siem_exercise_completed').
 * @param {number} pointsAwarded - The points calculated for this specific activity.
 * @param {number | null} score - The score (0-100) if applicable to the activity.
 * @param {number} durationMinutes - Time spent on the activity in minutes.
 * @param {string | null} activityId - The ID of the specific activity instance (e.g., quiz ID, scenario ID).
 * @param {string | null} tenantId - The tenant ID.
 * @returns {Promise<void>}
 */
export const updateProgress = async (userId, activityType, pointsAwarded, score = null, durationMinutes = 0, activityId = null, tenantId = null) => {
    try {
        console.log(`[GAMIFICATION] Updating progress for user ${userId} in tenant ${tenantId}. Activity: ${activityType}, Points: ${pointsAwarded}`);

        if (!tenantId) {
            const context = await getTenantContext(userId);
            tenantId = context.tenantId;
        }

        if (!UserProgress || typeof UserProgress.filter !== 'function') {
          throw new Error("UserProgress entity is not available for use.");
        }

        const progressRecords = await UserProgress.filter({ user_id: userId, tenant_id: tenantId });
        
        let currentProgress;
        let isNewProgress = false;

        if (progressRecords.length > 0) {
            currentProgress = progressRecords[0];
            console.log('[GAMIFICATION] Found existing progress record:', currentProgress);
        } else {
            console.log('[GAMIFICATION] No progress record found. Creating a new one.');
            isNewProgress = true;
            const user = await User.get(userId);
            if (!user) throw new Error(`User not found for progress creation: ${userId}`);

            currentProgress = {
                user_id: userId,
                tenant_id: tenantId,
                user_full_name: user?.full_name || 'N/A',
                is_super_admin_activity: user?.role === 'admin',
                points: 0,
                level: 1,
                points_to_next_level: levelThresholds[1] ? levelThresholds[1] - 0 : 0,
                total_scenarios_completed: 0,
                total_scenarios_attempted: 0,
                quiz_completions: 0,
                total_quiz_points: 0,
                siem_exercises_completed: 0,
                average_score: 0,
                total_time_spent: 0,
                skill_levels: {},
                achievements: [],
                current_streak: 0,
                longest_streak: 0,
                weekly_activity: [],
                last_activity: null,
            };
        }

        // --- Update progress data based on activity ---
        
        // 1. Update points
        const newTotalPoints = (currentProgress.points || 0) + pointsAwarded;

        // 2. Update level
        const { level: newLevel, pointsToNext: newPointsToNext } = getLevelFromPoints(newTotalPoints);

        // 3. Update total time spent
        const newTotalTimeSpent = (currentProgress.total_time_spent || 0) + (durationMinutes || 0);

        // 4. Update specific activity counters
        let newTotalScenariosCompleted = currentProgress.total_scenarios_completed || 0;
        let newTotalScenariosAttempted = currentProgress.total_scenarios_attempted || 0;
        let newQuizCompletions = currentProgress.quiz_completions || 0;
        let newTotalQuizPoints = currentProgress.total_quiz_points || 0;
        let newSiemExercisesCompleted = currentProgress.siem_exercises_completed || 0;

        if (activityType === 'scenario_completed') {
            newTotalScenariosCompleted += 1;
            newTotalScenariosAttempted = Math.max(newTotalScenariosCompleted, newTotalScenariosAttempted + 1);
        } else if (activityType === 'quiz_completed') {
            newQuizCompletions += 1;
            newTotalQuizPoints += pointsAwarded;
        } else if (activityType === 'siem_exercise_completed') {
            newSiemExercisesCompleted += 1;
            // SIEM exercises can also be considered as attempts/completions that increase general attempt count.
            newTotalScenariosAttempted = Math.max(newSiemExercisesCompleted, newTotalScenariosAttempted + 1);
        }
        // Other activity types (lesson_completed, siem_theory_lesson_completed, siem_phase_completed, first_login, daily_streak, achievement_unlocked)
        // just contribute points and don't directly increment these specific counters unless specified.

        // 5. Update average score (applies to activities with a score)
        let newAverageScore = currentProgress.average_score || 0;
        if (score !== null && score !== undefined) {
             const oldTotalScoredActivities = (currentProgress.total_scenarios_completed || 0) +
                                              (currentProgress.quiz_completions || 0) +
                                              (currentProgress.siem_exercises_completed || 0);
             
             if (oldTotalScoredActivities > 0) {
                newAverageScore = Math.round(
                    ((newAverageScore * oldTotalScoredActivities) + score) / (oldTotalScoredActivities + 1)
                );
             } else { // This is the first scored activity
                 newAverageScore = Math.round(score);
             }
        }
        
        const updatedProgressData = {
            ...currentProgress,
            points: newTotalPoints,
            level: newLevel,
            points_to_next_level: newPointsToNext,
            total_time_spent: newTotalTimeSpent,
            total_scenarios_completed: newTotalScenariosCompleted,
            total_scenarios_attempted: newTotalScenariosAttempted,
            quiz_completions: newQuizCompletions,
            total_quiz_points: newTotalQuizPoints,
            siem_exercises_completed: newSiemExercisesCompleted,
            average_score: newAverageScore,
            last_activity: new Date().toISOString(),
        };

        // --- Save the updated progress ---
        if (isNewProgress) {
            console.log('[GAMIFICATION] Creating new progress record with data:', updatedProgressData);
            await UserProgress.create(updatedProgressData);
        } else {
            const payload = {};
            // Only include fields that have changed, or core fields that must always be updated.
            for (const key in updatedProgressData) {
                // Perform a shallow comparison; for objects/arrays (skill_levels, achievements, weekly_activity)
                // assume they are not directly modified here, or handled by other services.
                // If they are modified, a deep comparison or explicit inclusion would be needed.
                if (updatedProgressData[key] !== currentProgress[key]) {
                    payload[key] = updatedProgressData[key];
                }
            }
            // Ensure core fields are always in the payload if they exist, even if numerically unchanged, for clarity or schema updates.
            // This is a tradeoff between efficiency (only changed fields) and robustness (guaranteeing core fields are sent).
            // For now, adhering to changes made in updatedProgressData by the function's logic.
            // If `payload` ends up empty, `UserProgress.update` should ideally handle it gracefully.
            if (Object.keys(payload).length > 0) {
                await UserProgress.update(currentProgress.id, payload);
                console.log(`[GAMIFICATION] Updated progress record ${currentProgress.id} with payload:`, payload);
            } else {
                console.log(`[GAMIFICATION] No significant changes detected for progress record ${currentProgress.id}. Skipping update.`);
            }
        }

        console.log(`[GAMIFICATION] Progress successfully updated for user ${userId}. New total points: ${newTotalPoints}. New level: ${newLevel}.`);

    } catch (error) {
        console.error(`[GAMIFICATION] Critical error updating progress for user ${userId}:`, error);
        throw error;
    }
};

/**
 * The definitive, robust service for awarding points and managing user progress for general activities.
 * SIEM specific activities should use `awardSiemPoints`.
 * @param {string} userId - The user's ID.
 * @param {string} activityType - 'quiz_completed', 'lesson_completed', 'scenario_completed', 'first_login', 'daily_streak', 'achievement_unlocked'.
 * @param {string | null} referenceId - The ID of the activity (e.g., quiz ID, lesson ID, scenario ID).
 * @param {number | null} score - The score (0-100) if applicable (e.g., for quiz_completed, scenario_completed).
 * @param {object} additionalMetadata - Additional metadata like difficulty, durationMinutes.
 * @returns {Promise<number>} The total points awarded.
 */
export const awardPoints = async (userId, activityType, referenceId = null, score = null, additionalMetadata = {}) => {
  try {
    const { tenantId } = await getTenantContext(userId);

    let pointsAwarded = 0;
    const config = pointsConfig[activityType];

    if (!config) {
      throw new Error(`[Gamification] Unknown or unconfigured activity type: ${activityType}`);
    }

    // Calculate points based on pointsConfig
    pointsAwarded = config.base_points || 0;

    // Apply difficulty multiplier if applicable
    if (config.difficulty_multiplier && additionalMetadata.difficulty) {
        const multiplier = config.difficulty_multiplier[additionalMetadata.difficulty] || 1.0;
        pointsAwarded *= multiplier;
    }

    // Apply perfect score bonus if applicable (using the 'score' parameter)
    if (config.perfect_score_bonus && score === 100) {
      pointsAwarded += config.perfect_score_bonus;
    }

    pointsAwarded = Math.round(pointsAwarded); // Round points to nearest integer

    // Validate points awarded (allow 0 for certain cases, but usually expect positive)
    if (pointsAwarded <= 0 && activityType !== 'first_login' && activityType !== 'daily_streak' && activityType !== 'achievement_unlocked') {
      console.log(`[Gamification] No points to award for activity: ${activityType} (calculated as ${pointsAwarded})`);
      return 0;
    }
    // SIEM activities should be handled by awardSiemPoints.
    if (activityType.startsWith('siem_')) {
      console.warn(`[Gamification] SIEM activity type '${activityType}' should be handled by 'awardSiemPoints'. Returning 0.`);
      return 0;
    }

    // Update user progress via the new central updateProgress function
    const durationMinutes = additionalMetadata.durationMinutes || 0;
    await updateProgress(userId, activityType, pointsAwarded, score, durationMinutes, referenceId, tenantId);

    // Record the transaction for auditing purposes
    if (PointsActivity && typeof PointsActivity.create === 'function') {
      await PointsActivity.create({
        user_id: userId,
        activity_type: activityType,
        points_earned: pointsAwarded,
        reference_id: referenceId,
        timestamp: new Date().toISOString(),
        metadata: { tenant_id: tenantId, score_value: score, ...additionalMetadata },
      });
    }

    return pointsAwarded;
  } catch (error) {
    console.error("[Gamification Service CRITICAL ERROR] awardPoints:", error);
    throw error;
  }
};

/**
 * Award points for SIEM Learning Path activities
 * @param {string} userId - The user's ID.
 * @param {string} activityType - 'siem_theory_lesson_completed', 'siem_exercise_completed', or 'siem_phase_completed'.
 * @param {string | null} referenceId - The ID of the SIEM activity (e.g., lesson ID, exercise ID, phase ID).
 * @param {number | null} score - The score (0-100) if applicable, e.g., for siem_exercise_completed.
 * @param {object} additionalMetadata - Additional metadata like difficulty, phase_number, durationMinutes.
 * @returns {Promise<number>} The total points awarded.
 */
export async function awardSiemPoints(userId, activityType, referenceId = null, score = null, additionalMetadata = {}) {
  try {
    console.log(`[GAMIFICATION] SIEM Award: ${activityType} for user ${userId}`);

    const { tenantId } = await getTenantContext(userId);

    const config = pointsConfig[activityType];
    if (!config) {
      throw new Error(`[GAMification] SIEM: Unknown activity type: ${activityType}`);
    }

    let pointsEarned = config.base_points || 0;

    // Apply difficulty multiplier
    if (config.difficulty_multiplier && additionalMetadata.difficulty) {
      const multiplier = config.difficulty_multiplier[additionalMetadata.difficulty] || 1.0;
      pointsEarned *= multiplier;
    }

    // Apply phase multiplier for phase completion
    if (config.phase_multiplier && additionalMetadata.phase_number) {
      const multiplier = config.phase_multiplier[additionalMetadata.phase_number] || 1.0;
      pointsEarned *= multiplier;
    }

    // Apply score multiplier for exercises
    if (config.score_multiplier && score !== null) {
      pointsEarned *= (score / 100);
    }

    // Perfect score bonus
    if (config.perfect_score_bonus && score === 100) {
      pointsEarned += config.perfect_score_bonus;
    }

    pointsEarned = Math.round(pointsEarned);

    if (pointsEarned <= 0) {
      console.log(`[Gamification] SIEM: No points calculated for activity: ${activityType}`);
      return 0;
    }

    // Prevent duplicate awards for same activity based on user, activity type, and reference ID
    const existingActivity = await PointsActivity.filter({
      user_id: userId,
      activity_type: activityType,
      reference_id: referenceId,
      'metadata.tenant_id': tenantId
    });

    if (existingActivity.length > 0) {
      console.log(`[Gamification] SIEM: Activity already awarded: ${activityType} - ${referenceId}. Skipping.`);
      return 0;
    }

    // Update user progress via the new central updateProgress function
    const durationMinutes = additionalMetadata.durationMinutes || 0;
    await updateProgress(userId, activityType, pointsEarned, score, durationMinutes, referenceId, tenantId);

    // Record the activity for auditing purposes
    if (PointsActivity && typeof PointsActivity.create === 'function') {
      await PointsActivity.create({
        user_id: userId,
        activity_type: activityType,
        points_earned: pointsEarned,
        reference_id: referenceId,
        metadata: {
          ...additionalMetadata,
          score: score,
          tenant_id: tenantId,
          siem_activity: true
        },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[Gamification] SIEM: Awarded ${pointsEarned} points for ${activityType}`);
    return pointsEarned;

  } catch (error) {
    console.error('[Gamification] SIEM: Error awarding points:', error);
    throw error;
  }
}
