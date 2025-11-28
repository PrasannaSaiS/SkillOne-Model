import { supabase } from "./supabaseClient";

const API_BASE_URL = "https://PrasannaSaiS-skillone-api.hf.space";

// ============== LEARNER PROFILE MANAGEMENT ==============

export async function saveLearnerProfile(
  learnerId: string,
  profile: {
    career_goal: string;
    education_level: string;
    skills: string[];
    interests: string[];
    proficiency_level: string;
  }
) {
  try {
    const { data, error } = await supabase
      .from("learner_profiles")
      .upsert(
        {
          learner_id: learnerId,
          career_goal: profile.career_goal,
          education_level: profile.education_level,
          desired_skills: profile.skills,
          interests: profile.interests,
          proficiency_level: profile.proficiency_level,
          updated_at: new Date(),
        },
        { onConflict: "learner_id" }
      )
      .select();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error saving learner profile:", err);
    throw err;
  }
}

export async function getLearnerProfile(learnerId: string) {
  try {
    const { data, error } = await supabase
      .from("learner_profiles")
      .select("*")
      .eq("learner_id", learnerId)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
    return data || null;
  } catch (err) {
    console.error("Error fetching learner profile:", err);
    return null;
  }
}

// ============== AUTOCOMPLETE SUGGESTIONS ==============

export async function fetchCareerSuggestions(query: string) {
  try {
    // First try backend
    const res = await fetch(
      `${API_BASE_URL}/api/career-goals/suggestions?query=${query}`
    );

    if (res.ok) {
      const data = await res.json();
      return data.suggestions || [];
    }

    // Fallback: Get from local Supabase database
    console.log("Backend unavailable, using local suggestions");
    const { data, error } = await supabase
      .from("career_goal_logs")
      .select("career_goal, frequency")
      .ilike("career_goal", `%${query}%`)
      .order("frequency", { ascending: false })
      .limit(10);

    if (error) throw error;
    return (data || []).map((item: any) => item.career_goal);
  } catch (err) {
    console.error("Error fetching career suggestions:", err);
    return [];
  }
}

// ============== SKILL SUGGESTIONS ==============

export async function fetchSkillSuggestions(query: string) {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("tags")
      .filter("tags", "cs", `{${query}}`)
      .limit(50);

    if (error) throw error;

    // Extract unique tags matching query
    const allTags = new Set<string>();
    (data || []).forEach((row: any) => {
      if (row.tags && Array.isArray(row.tags)) {
        row.tags.forEach((tag: string) => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            allTags.add(tag);
          }
        });
      }
    });

    return Array.from(allTags).slice(0, 10);
  } catch (err) {
    console.error("Error fetching skill suggestions:", err);
    return [];
  }
}

// ============== INTEREST SUGGESTIONS ==============

export async function fetchInterestSuggestions(query: string) {
  try {
    // Get unique interests from learner profiles
    const { data, error } = await supabase
      .from("learner_profiles")
      .select("interests")
      .limit(100);

    if (error) throw error;

    const allInterests = new Set<string>();
    (data || []).forEach((row: any) => {
      if (row.interests && Array.isArray(row.interests)) {
        row.interests.forEach((interest: string) => {
          if (interest.toLowerCase().includes(query.toLowerCase())) {
            allInterests.add(interest);
          }
        });
      }
    });

    return Array.from(allInterests).slice(0, 10);
  } catch (err) {
    console.error("Error fetching interest suggestions:", err);
    return [];
  }
}

// ============== CAREER GOAL LOGGING ==============

export async function logCareerGoal(careerGoal: string) {
  try {
    // Check if it exists
    const { data: existing } = await supabase
      .from("career_goal_logs")
      .select("frequency")
      .eq("career_goal", careerGoal)
      .single();

    if (existing) {
      // Update frequency
      await supabase
        .from("career_goal_logs")
        .update({ frequency: existing.frequency + 1, updated_at: new Date() })
        .eq("career_goal", careerGoal);
    } else {
      // Insert new
      await supabase.from("career_goal_logs").insert({
        career_goal: careerGoal,
        frequency: 1,
      });
    }
  } catch (err) {
    console.error("Error logging career goal:", err);
  }
}

// ============== LEARNING PATH GENERATION ==============

export async function generateLearningPath(
  profile: {
    careerGoal: string;
    educationLevel: string;
    skills: string[];
    interests?: string[];
    proficiencyLevel?: string;
  },
  learnerId: string
): Promise<any> {
  try {
    // Save learner profile first
    await saveLearnerProfile(learnerId, {
      career_goal: profile.careerGoal,
      education_level: profile.educationLevel,
      skills: profile.skills,
      interests: profile.interests || [],
      proficiency_level: profile.proficiencyLevel || "Beginner",
    });

    // Log career goal for suggestions
    await logCareerGoal(profile.careerGoal);

    // Call backend API
    const response = await fetch(
      `${API_BASE_URL}/api/generate-learning-path`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learner_id: learnerId,
          career_goal: profile.careerGoal,
          education_level: profile.educationLevel,
          desired_skills: profile.skills,
          interests: profile.interests || [],
          proficiency_level: profile.proficiencyLevel || "Beginner",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate path: ${errorText}`);
    }

    const data = await response.json();
    return data; // Returns: { learning_path, scores, reasoning, total_courses, pathway_details }
  } catch (err) {
    console.error("Error generating learning path:", err);
    throw err;
  }
}

// ============== LEARNING PATH RETRIEVAL ==============

export async function fetchLearningPaths(learnerId: string) {
  try {
    const { data, error } = await supabase
      .from("learning_paths")
      .select(
        `
        id,
        learner_id,
        course_sequence,
        relevance_scores,
        reasoning,
        created_at
      `
      )
      .eq("learner_id", learnerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching learning paths:", err);
    return [];
  }
}

// ============== COURSE DETAILS ==============

export async function fetchCoursesByIds(courseIds: string[]) {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select(
        `
        id,
        title,
        description,
        difficulty_level,
        education_level,
        tags,
        prerequisite_course_ids
      `
      )
      .in("id", courseIds);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching courses:", err);
    return [];
  }
}

export async function fetchCourseMaterials(courseId: string) {
  try {
    const { data, error } = await supabase
      .from("course_files")
      .select("id, material_type, material_url, material_name")
      .eq("course_id", courseId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching course materials:", err);
    return [];
  }
}

// ============== LEARNER INTERACTIONS ==============

export async function trackCourseInteraction(
  learnerId: string,
  courseId: string,
  interactionType: "viewed" | "started" | "completed" | "rated" | "bookmarked",
  rating?: number
) {
  try {
    const { error } = await supabase
      .from("learner_course_interactions")
      .insert({
        learner_id: learnerId,
        course_id: courseId,
        interaction_type: interactionType,
        rating: rating || null,
      });

    if (error) throw error;
  } catch (err) {
    console.error("Error tracking interaction:", err);
  }
}