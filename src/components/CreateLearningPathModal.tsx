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

const API_BASE_URL = "https://PrasannaSaiS-skillone-api.hf.space";

interface CreateLearningPathModalProps {
  learnerId: string;
  onClose: () => void;
  onPathCreated?: () => void;
}

export default function CreateLearningPathModal({
  learnerId,
  onClose,
  onPathCreated,
}: CreateLearningPathModalProps) {
  const [careerGoal, setCareerGoal] = useState("");
  const [careerSuggestions, setCareerSuggestions] = useState<string[]>([]);
  const [showCareerSuggestions, setShowCareerSuggestions] = useState(false);

  const [educationLevel, setEducationLevel] = useState("High School");

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

  // Load previous profile if exists
  useEffect(() => {
    const loadProfile = async () => {
      const profile = await getLearnerProfile(learnerId);
      if (profile) {
        setCareerGoal(profile.career_goal);
        setEducationLevel(profile.education_level);
        setSkills(profile.desired_skills || []);
        setInterests(profile.interests || []);
        setProficiency(profile.proficiency_level);
      }
    };
    loadProfile();
  }, [learnerId]);

  // ============== CAREER GOAL HANDLING ==============
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

  // ============== SKILL HANDLING ==============
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

  // ============== INTEREST HANDLING ==============
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

  // ============== FORM SUBMISSION ==============
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
      // Generate learning path
      const pathData = await generateLearningPath(
        {
          careerGoal,
          educationLevel,
          skills,
          interests,
          proficiencyLevel: proficiency,
        },
        learnerId
      );

      alert(
        `Learning path created with ${pathData.total_courses} courses!`
      );

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Create Your Learning Path</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Career Goal */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Career Goal / Role *
            </label>
            <div className="relative">
              <input
                type="text"
                value={careerGoal}
                onChange={(e) => handleCareerInput(e.target.value)}
                placeholder="e.g., Data Scientist, Python Developer..."
                className="w-full border rounded px-3 py-2"
              />
              {showCareerSuggestions && careerSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded mt-1 shadow-lg z-10">
                  {careerSuggestions.map((suggestion) => (
                    <div
                      key={suggestion}
                      onClick={() => selectCareerGoal(suggestion)}
                      className="p-2 hover:bg-blue-100 cursor-pointer"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Education Level */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Education Level *
            </label>
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option>High School</option>
              <option>Undergraduate</option>
              <option>Graduate</option>
              <option>Professional</option>
            </select>
          </div>

          {/* Proficiency Level */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Current Proficiency Level
            </label>
            <select
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Skills to Learn * (Add at least 1)
            </label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
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
                  placeholder="e.g., Python, Machine Learning..."
                  className="w-full border rounded px-3 py-2"
                />
                {showSkillSuggestions && skillSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded mt-1 shadow-lg z-10">
                    {skillSuggestions.map((suggestion) => (
                      <div
                        key={suggestion}
                        onClick={() => addSkill(suggestion)}
                        className="p-2 hover:bg-blue-100 cursor-pointer"
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => addSkill()}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                + Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="text-blue-600 hover:text-blue-900 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Interests (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
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
                  placeholder="e.g., AI, Web Development..."
                  className="w-full border rounded px-3 py-2"
                />
                {showInterestSuggestions && interestSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded mt-1 shadow-lg z-10">
                    {interestSuggestions.map((suggestion) => (
                      <div
                        key={suggestion}
                        onClick={() => addInterest(suggestion)}
                        className="p-2 hover:bg-blue-100 cursor-pointer"
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => addInterest()}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                + Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center gap-2"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => removeInterest(interest)}
                    className="text-green-600 hover:text-green-900 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Generating..." : "Generate Path"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}