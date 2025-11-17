import { useState } from "react";
import { supabase } from "../services/supabaseClient";

// ✅ Import the API base URL
const API_BASE_URL = "https://PrasannaSaiS-skillone-api.hf.space";

interface CreateLearningPathModalProps {
  onClose: () => void;
}

export default function CreateLearningPathModal({ onClose }: CreateLearningPathModalProps) {
  const [learnerId] = useState(`learner_${Date.now()}`);
  const [careerGoal, setCareerGoal] = useState("");
  const [careerSuggestions, setCareerSuggestions] = useState<string[]>([]);
  const [educationLevel, setEducationLevel] = useState("High School");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [proficiency, setProficiency] = useState("Beginner");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ✅ FIXED: Use deployed API URL
  const handleCareerInput = async (value: string) => {
    setCareerGoal(value);
    if (value.length > 2) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/career-goals/suggestions?query=${value}`
        );
        const data = await res.json();
        setCareerSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleAddSkill = () => {
    const val = skillInput.trim();
    if (val && !skills.includes(val)) {
      setSkills([...skills, val]);
      setSkillInput("");
    }
  };

  const handleAddInterest = () => {
    const val = interestInput.trim();
    if (val && !interests.includes(val)) {
      setInterests([...interests, val]);
      setInterestInput("");
    }
  };

  // ✅ FIXED: Use deployed API URL
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careerGoal || skills.length === 0) {
      alert("Please fill in career goal and at least one skill");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/generate-learning-path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learner_id: learnerId,
          career_goal: careerGoal,
          education_level: educationLevel,
          desired_skills: skills,
          interests: interests,
          proficiency_level: proficiency,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to generate path: ${errorText}`);
      }

      const data = await res.json();
      alert(`Learning path created with ${data.total_courses} courses!`);
      onClose();
    } catch (err: any) {
      console.error("Full error:", err);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Create Your Learning Path</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block font-medium mb-1">Career Goal / Role *</label>
            <div className="relative">
              <input
                className="w-full border px-3 py-2 rounded"
                placeholder="e.g., Data Scientist, Full Stack Developer"
                value={careerGoal}
                onChange={(e) => handleCareerInput(e.target.value)}
                required
              />
              {showSuggestions && careerSuggestions.length > 0 && (
                <div className="absolute top-12 left-0 right-0 bg-white border rounded shadow-lg z-10">
                  {careerSuggestions.map((suggestion) => (
                    <div
                      key={suggestion}
                      onClick={() => {
                        setCareerGoal(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="p-2 hover:bg-blue-100 cursor-pointer"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block font-medium mb-1">Education Level *</label>
              <select
                className="w-full border px-3 py-2 rounded"
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
              >
                <option value="High School">High School</option>
                <option value="Undergraduate">Undergraduate</option>
                <option value="Graduate">Graduate</option>
                <option value="Professional">Professional</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Proficiency Level</label>
              <select
                className="w-full border px-3 py-2 rounded"
                value={proficiency}
                onChange={(e) => setProficiency(e.target.value)}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Skills to Learn *</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                className="flex-1 border px-3 py-2 rounded"
                placeholder="e.g., Python Programming"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(); } }}
              />
              <button type="button" className="bg-blue-600 text-white px-3 py-2 rounded" onClick={handleAddSkill}>
                + Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                  {skill} ×
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Interests (Optional)</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                className="flex-1 border px-3 py-2 rounded"
                placeholder="e.g., Machine Learning"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddInterest(); } }}
              />
              <button type="button" className="bg-green-600 text-white px-3 py-2 rounded" onClick={handleAddInterest}>
                + Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span key={interest} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                  {interest} ×
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" className="px-6 py-2 border rounded" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded" disabled={loading}>
              {loading ? "Generating..." : "Generate Path"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
