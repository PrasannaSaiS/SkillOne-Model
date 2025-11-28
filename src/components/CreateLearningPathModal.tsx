// ============================================================================
// SkillOne - Create Learning Path Modal (COMPLETE FIX v2)
// Purpose: Collect learner profile & generate personalized learning paths
// Theme: Matches dark purple/indigo design system
// CRITICAL FIX: Button type separation - Navigation buttons ALWAYS type="button"
// ============================================================================

import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import {
  saveLearnerProfile,
  getLearnerProfile,
  fetchCareerSuggestions,
  fetchSkillSuggestions,
  fetchInterestSuggestions,
  generateLearningPath,
  logCareerGoal,
} from "../services/learningPathService";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CreateLearningPathModalProps {
  learnerId: string;
  onClose: () => void;
  onPathCreated?: () => void;
}

// ============================================================================
// CREATE LEARNING PATH MODAL COMPONENT
// ============================================================================

export default function CreateLearningPathModal({
  learnerId,
  onClose,
  onPathCreated,
}: CreateLearningPathModalProps) {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  const [careerGoal, setCareerGoal] = useState("");
  const [careerSuggestions, setCareerSuggestions] = useState<string[]>([]);
  const [showCareerSuggestions, setShowCareerSuggestions] = useState(false);

  const [educationLevel, setEducationLevel] = useState("Undergraduate");
  const [skillInput, setSkillInput] = useState("");
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);

  const [interestInput, setInterestInput] = useState("");
  const [interestSuggestions, setInterestSuggestions] = useState<string[]>([]);
  const [showInterestSuggestions, setShowInterestSuggestions] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);

  const [proficiency, setProficiency] = useState("Beginner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // Multi-step form

  // ========================================================================
  // LOAD PREVIOUS PROFILE
  // ========================================================================

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await getLearnerProfile(learnerId);
      if (profile) {
        setCareerGoal(profile.career_goal || "");
        setEducationLevel(profile.education_level || "Undergraduate");
        setSkills(profile.desired_skills || []);
        setInterests(profile.interests || []);
        setProficiency(profile.proficiency_level || "Beginner");
      }
    };
    loadProfile();
  }, [learnerId]);

  // ========================================================================
  // CAREER GOAL HANDLING
  // ========================================================================

  const handleCareerInput = async (value: string) => {
    setCareerGoal(value);
    if (value.length > 1) {
      try {
        const suggestions = await fetchCareerSuggestions(value);
        setCareerSuggestions(suggestions);
        setShowCareerSuggestions(true);
      } catch (err) {
        console.error("Error fetching career suggestions:", err);
      }
    } else {
      setShowCareerSuggestions(false);
    }
  };

  const selectCareerGoal = (suggestion: string) => {
    setCareerGoal(suggestion);
    setShowCareerSuggestions(false);
  };

  // ========================================================================
  // SKILL HANDLING
  // ========================================================================

  const handleSkillInput = async (value: string) => {
    setSkillInput(value);
    if (value.length > 1) {
      try {
        const suggestions = await fetchSkillSuggestions(value);
        setSkillSuggestions(suggestions);
        setShowSkillSuggestions(true);
      } catch (err) {
        console.error("Error fetching skill suggestions:", err);
      }
    } else {
      setShowSkillSuggestions(false);
    }
  };

  const addSkill = (skill?: string) => {
    const skillToAdd = skill || skillInput.trim();
    if (skillToAdd && !skills.includes(skillToAdd)) {
      setSkills([...skills, skillToAdd]);
      setSkillInput("");
      setShowSkillSuggestions(false);
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  // ========================================================================
  // INTEREST HANDLING
  // ========================================================================

  const handleInterestInput = async (value: string) => {
    setInterestInput(value);
    if (value.length > 1) {
      try {
        const suggestions = await fetchInterestSuggestions(value);
        setInterestSuggestions(suggestions);
        setShowInterestSuggestions(true);
      } catch (err) {
        console.error("Error fetching interest suggestions:", err);
      }
    } else {
      setShowInterestSuggestions(false);
    }
  };

  const addInterest = (interest?: string) => {
    const interestToAdd = interest || interestInput.trim();
    if (interestToAdd && !interests.includes(interestToAdd)) {
      setInterests([...interests, interestToAdd]);
      setInterestInput("");
      setShowInterestSuggestions(false);
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  // ========================================================================
  // FORM SUBMISSION
  // ========================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!careerGoal.trim()) {
      setError("Please enter a career goal");
      return;
    }

    if (skills.length === 0) {
      setError("Please add at least one skill");
      return;
    }

    setLoading(true);
    try {
      // Save learner profile
      await saveLearnerProfile(learnerId, {
        career_goal: careerGoal,
        education_level: educationLevel,
        skills: skills,
        interests: interests,
        proficiency_level: proficiency,
      });

      // Generate learning path
      const pathData = await generateLearningPath(
        {
          careerGoal: careerGoal,
          educationLevel: educationLevel,
          skills: skills,
          interests: interests,
          proficiencyLevel: proficiency,
        },
        learnerId
      );

      // Success notification
      alert(`Learning path created with ${pathData.total_courses} courses!`);

      // Refresh learning paths in parent component
      onPathCreated?.();

      // Close modal
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to generate learning path");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // RENDER - MULTI-STEP FORM
  // ========================================================================

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30 shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 flex justify-between items-start p-6 border-b border-purple-500/20 bg-slate-800/95 backdrop-blur">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Create Your Learning Path
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Step {step} of 3 - Personalized roadmap
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
              <div>
                <p className="font-bold text-red-300">Error</p>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex gap-2 mb-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    s <= step
                      ? "bg-gradient-to-r from-purple-500 to-indigo-600"
                      : "bg-slate-700"
                  }`}
                ></div>
              ))}
            </div>
            <p className="text-gray-400 text-sm">
              Step {step} of 3 Complete
            </p>
          </div>

          {/* STEP 1: Career Goal & Education */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Career Goal */}
              <div>
                <label className="block text-sm font-bold text-purple-300 mb-2">
                  What's your career goal?
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={careerGoal}
                    onChange={(e) => handleCareerInput(e.target.value)}
                    placeholder="e.g., Data Scientist, Full Stack Developer..."
                    className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                  />
                  {showCareerSuggestions && careerSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-700 border border-purple-500/30 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {careerSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => selectCareerGoal(suggestion)}
                          className="w-full text-left px-4 py-2 hover:bg-purple-600/30 text-gray-300 transition-colors border-b border-slate-600 last:border-b-0"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Education Level */}
              <div>
                <label className="block text-sm font-bold text-purple-300 mb-2">
                  🎓 Education Level
                </label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                >
                  <option value="High School">High School</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Professional">Professional</option>
                </select>
              </div>

              {/* Proficiency Level */}
              <div>
                <label className="block text-sm font-bold text-purple-300 mb-2">
                  📊 Current Proficiency Level
                </label>
                <select
                  value={proficiency}
                  onChange={(e) => setProficiency(e.target.value)}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                >
                  <option value="Beginner">Beginner - Just starting out</option>
                  <option value="Intermediate">
                    Intermediate - Some experience
                  </option>
                  <option value="Advanced">Advanced - Very experienced</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: Skills */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-purple-300 mb-2">
                  🔧 Skills to Learn (At least 1 required)
                </label>
                <div className="relative mb-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => handleSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      placeholder="e.g., Python, Machine Learning, React..."
                      className="flex-1 bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => addSkill()}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-bold transition-all"
                    >
                      + Add
                    </button>
                  </div>

                  {showSkillSuggestions && skillSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-700 border border-purple-500/30 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {skillSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => addSkill(suggestion)}
                          className="w-full text-left px-4 py-2 hover:bg-purple-600/30 text-gray-300 transition-colors border-b border-slate-600 last:border-b-0"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skills Tags */}
                {skills.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">
                    No skills added yet. Add at least one to continue.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <div
                        key={skill}
                        className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/50 text-purple-200 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 group"
                      >
                        ✓ {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="text-purple-300 hover:text-purple-100 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Interests */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-purple-300 mb-2">
                  ❤️ Interests (Optional - Helps personalize further)
                </label>
                <div className="relative mb-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={interestInput}
                      onChange={(e) => handleInterestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addInterest();
                        }
                      }}
                      placeholder="e.g., AI, Web Development, Cloud Computing..."
                      className="flex-1 bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => addInterest()}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-bold transition-all"
                    >
                      + Add
                    </button>
                  </div>

                  {showInterestSuggestions && interestSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-700 border border-purple-500/30 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {interestSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => addInterest(suggestion)}
                          className="w-full text-left px-4 py-2 hover:bg-purple-600/30 text-gray-300 transition-colors border-b border-slate-600 last:border-b-0"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interests Tags */}
                {interests.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">
                    No interests added yet. (Optional)
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest) => (
                      <div
                        key={interest}
                        className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/50 text-emerald-200 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 group"
                      >
                        ❤️ {interest}
                        <button
                          type="button"
                          onClick={() => removeInterest(interest)}
                          className="text-emerald-300 hover:text-emerald-100 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-slate-700/50 border border-purple-500/20 rounded-lg p-4">
                <p className="text-sm text-gray-300 font-semibold mb-2">
                  📋 Your Learning Profile Summary
                </p>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>
                    🎯 Career Goal:{" "}
                    <span className="text-purple-300">{careerGoal}</span>
                  </li>
                  <li>
                    🎓 Education:{" "}
                    <span className="text-purple-300">{educationLevel}</span>
                  </li>
                  <li>
                    📊 Level: <span className="text-purple-300">{proficiency}</span>
                  </li>
                  <li>
                    🔧 Skills:{" "}
                    <span className="text-purple-300">{skills.length} added</span>
                  </li>
                  <li>
                    ❤️ Interests:{" "}
                    <span className="text-purple-300">{interests.length} added</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Buttons Section - CRITICAL: Separate navigation from submit */}
          <div className="flex gap-3 mt-8">
            {/* BACK BUTTON - Always type="button", never submits */}
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-all"
              >
                ← Back
              </button>
            )}

            {/* NEXT STEP BUTTON - Always type="button", never submits */}
            {step < 3 && (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !careerGoal.trim()) {
                    setError("Please enter a career goal");
                  } else if (step === 2 && skills.length === 0) {
                    setError("Please add at least one skill");
                  } else {
                    setError("");
                    setStep(step + 1);
                  }
                }}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
              >
                Next Step →
              </button>
            )}

            {/* SUBMIT BUTTON - Only on Step 3, type="submit" to trigger handleSubmit */}
            {step === 3 && (
              <button
                type="submit"
                disabled={loading || skills.length === 0}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
              >
                {loading ? "🔄 Generating Path..." : "🚀 Generate My Learning Path"}
              </button>
            )}

            {/* CANCEL BUTTON - Always type="button" */}
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}