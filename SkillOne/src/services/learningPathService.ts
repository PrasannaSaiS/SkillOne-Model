import { supabase } from "./supabaseClient";
import { API_BASE_URL } from "../config";
export async function generateLearningPath(
  profile: {
    careerGoal: string;
    educationLevel: string;
    skills: string[];
    interests?: string[];
  },
  learnerId: string
): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-learning-path`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        career_goal: profile.careerGoal,
        education_level: profile.educationLevel,
        desired_skills: profile.skills,
      }),
    });

    if (!response.ok) throw new Error("Failed to generate path");
    const data = await response.json();
    return data.learning_path;
  } catch (err) {
    console.error("ML backend error:", err);
    // Fallback to simple algorithm if backend unavailable
    return [];
  }
}
