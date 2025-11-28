// SkillOne - Add/Edit Course Modal (Complete Redesign)
// Purpose: Create and manage courses with materials & prerequisites


import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";


// TYPE DEFINITIONS

interface AddCourseModalProps {
  editingCourse?: any;
  onClose: (refresh?: boolean) => void;
  onCourseAdded?: () => void;
}

type Material = {
  id?: string;
  material_type: string;
  material_url: string;
  material_name?: string;
};


// ADD COURSE MODAL COMPONENT

export default function AddCourseModal({
  editingCourse,
  onClose,
  onCourseAdded,
}: AddCourseModalProps) {

  // STATE MANAGEMENT
  const [title, setTitle] = useState(editingCourse?.title || "");
  const [description, setDescription] = useState(editingCourse?.description || "");
  const [difficulty, setDifficulty] = useState(editingCourse?.difficulty_level || "Beginner");
  const [education, setEducation] = useState(editingCourse?.education_level || "Undergraduate");

  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(editingCourse?.tags || []);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [selectedPrereqs, setSelectedPrereqs] = useState<string[]>(
    editingCourse?.prerequisite_course_ids || []
  );

  const [linkInput, setLinkInput] = useState("");
  const [linkType, setLinkType] = useState("youtube");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // FETCH INITIAL DATA
  
  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title");
      setAllCourses(data || []);
    };

    fetchCourses();

    // Fetch existing materials if editing
    if (editingCourse?.id) {
      const fetchMaterials = async () => {
        const { data } = await supabase
          .from("course_files")
          .select("*")
          .eq("course_id", editingCourse.id);

        if (data) {
          setMaterials(
            data.map((m) => ({
              id: m.id,
              material_type: m.material_type,
              material_url: m.material_url,
              material_name: m.material_name,
            }))
          );
        }
      };
      fetchMaterials();
    }
  }, [editingCourse?.id]);

    // TAG MANAGEMENT
  
  const handleAddTag = () => {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };

    // MATERIAL MANAGEMENT
  
  const handleAddLink = () => {
    const url = linkInput.trim();
    if (!url) {
      setError("Please enter a valid URL");
      return;
    }

    setMaterials([
      ...materials,
      {
        material_type: linkType,
        material_url: url,
        material_name: url.substring(0, 50),
      },
    ]);
    setLinkInput("");
    setError("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const filePath = `${Date.now()}_${file.name}`;

      const { data, error: uploadError } = await supabase.storage
        .from("course-materials")
        .upload(filePath, file);

      if (uploadError) {
        setError("File upload failed: " + uploadError.message);
        setSaving(false);
        return;
      }

      const publicUrl = supabase.storage
        .from("course-materials")
        .getPublicUrl(data?.path!).data.publicUrl;

      setMaterials([
        ...materials,
        {
          material_type: "pdf",
          material_url: publicUrl,
          material_name: file.name,
        },
      ]);
      setError("");
    } catch (err) {
      setError("Error uploading file");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMaterial = (i: number) => {
    setMaterials(materials.filter((_, ix) => ix !== i));
  };

    // PREREQUISITE MANAGEMENT
  
  const togglePrereq = (courseId: string) => {
    if (selectedPrereqs.includes(courseId)) {
      setSelectedPrereqs(selectedPrereqs.filter((id) => id !== courseId));
    } else {
      setSelectedPrereqs([...selectedPrereqs, courseId]);
    }
  };

    // FORM SUBMISSION
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!title.trim()) {
      setError("Course title is required");
      return;
    }

    if (!description.trim()) {
      setError("Course description is required");
      return;
    }

    if (tags.length === 0) {
      setError("Please add at least one skill/topic tag");
      return;
    }

    setSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      difficulty_level: difficulty,
      education_level: education,
      tags,
      prerequisite_course_ids: selectedPrereqs,
    };

    try {
      let courseId = editingCourse?.id;

      if (courseId) {
        // Update existing course
        await supabase.from("courses").update(payload).eq("id", courseId);
      } else {
        // Create new course
        const { data, error: insertError } = await supabase
          .from("courses")
          .insert([payload])
          .select();

        if (insertError || !data || data.length === 0) {
          throw insertError || new Error("Failed to create course");
        }

        courseId = data[0].id;
      }

      // Save materials
      if (courseId) {
        // Delete old materials if editing
        await supabase
          .from("course_files")
          .delete()
          .eq("course_id", courseId);

        // Insert new materials
        for (const m of materials) {
          await supabase.from("course_files").insert({
            course_id: courseId,
            material_type: m.material_type,
            material_url: m.material_url,
            material_name: m.material_name,
          });
        }
      }

      // Success
      alert(
        `Course ${editingCourse ? "updated" : "created"} successfully!`
      );
      setSaving(false);
      onCourseAdded?.();
      onClose(true);
    } catch (err: any) {
      setError(err.message || "Failed to save course");
      console.error("Error:", err);
      setSaving(false);
    }
  };

    // RENDER - UI STRUCTURE
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30 shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 flex justify-between items-start p-6 border-b border-purple-500/20 bg-slate-800/95 backdrop-blur">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {editingCourse ? "Edit Course" : "Create New Course"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {editingCourse
                ? "Update course details and materials"
                : "Add a new course to the library"}
            </p>
          </div>
          <button
            onClick={() => onClose()}
            className="text-gray-400 hover:text-white transition-colors text-2xl w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-red-300">Error</p>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Course Title */}
          <div>
            <label className="block text-sm font-bold text-purple-300 mb-2">
              Course Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Advanced Python Programming"
              className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-purple-300 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what students will learn..."
              rows={4}
              className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all resize-none"
              required
            />
          </div>

          {/* Difficulty & Education Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-purple-300 mb-2">
                Difficulty Level *
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                required
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-purple-300 mb-2">
                Education Level *
              </label>
              <select
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                required
              >
                <option value="High School">High School</option>
                <option value="Undergraduate">Undergraduate</option>
                <option value="Graduate">Graduate</option>
                <option value="Professional">Professional</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-purple-300 mb-2">
              Skills/Topics *
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="e.g., Python, Data Science, Web Dev..."
                className="flex-1 bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-bold transition-all"
              >
                + Add
              </button>
            </div>

            {tags.length === 0 ? (
              <p className="text-gray-400 text-sm italic">
                No tags added. Please add at least one.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/50 text-purple-200 px-3 py-1 rounded-lg font-semibold text-sm flex items-center gap-2 group"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-purple-300 hover:text-purple-100 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prerequisites */}
          <div>
            <label className="block text-sm font-bold text-purple-300 mb-3">
              Prerequisite Courses (Optional)
            </label>
            {allCourses.filter((c) => c.id !== editingCourse?.id).length === 0 ? (
              <p className="text-gray-400 text-sm italic">
                No other courses available yet.
              </p>
            ) : (
              <div className="space-y-2 bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                {allCourses
                  .filter((c) => c.id !== editingCourse?.id)
                  .map((course) => (
                    <label
                      key={course.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPrereqs.includes(course.id)}
                        onChange={() => togglePrereq(course.id)}
                        className="w-4 h-4 rounded border-purple-500 cursor-pointer"
                      />
                      <span className="text-gray-300">{course.title}</span>
                    </label>
                  ))}
              </div>
            )}
          </div>

          {/* Materials Section */}
          <div className="border-t border-purple-500/20 pt-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Course Materials (Optional)
            </h3>

            {/* Add Link */}
            <div className="mb-6 bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <p className="text-sm font-semibold text-gray-300 mb-3">
                Add Links (YouTube, Web, etc.)
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="Paste YouTube or web link..."
                  className="flex-1 bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all text-sm"
                />
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value)}
                  className="bg-slate-700/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                >
                  <option value="youtube">YouTube</option>
                  <option value="web">Web Link</option>
                  <option value="docs">Documentation</option>
                  <option value="other">Other</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm"
                >
                  + Link
                </button>
              </div>
            </div>

            {/* Add File */}
            <div className="mb-6 bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <p className="text-sm font-semibold text-gray-300 mb-3">
                Upload PDF or File
              </p>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt"
                disabled={saving}
                className="w-full text-sm text-gray-300 cursor-pointer"
              />
            </div>

            {/* Materials List */}
            {materials.length === 0 ? (
              <div className="text-center py-6 bg-slate-700/20 rounded-lg border border-dashed border-slate-600">
                <p className="text-gray-400 text-sm">
                  No materials added yet. (Optional)
                </p>
              </div>
            ) : (
              <div className="space-y-2 bg-slate-700/20 rounded-lg p-4 border border-slate-600">
                {materials.map((m, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-slate-700/50 rounded-lg p-3 border border-slate-600 hover:border-purple-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl">
                        {m.material_type === "youtube"
                          ? "▶️"
                          : m.material_type === "pdf"
                          ? "📄"
                          : "🔗"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-purple-300 uppercase">
                          {m.material_type}
                        </span>
                        <p className="text-gray-300 text-sm truncate">
                          {m.material_name || m.material_url}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(i)}
                      className="ml-2 text-red-400 hover:text-red-300 font-bold transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-purple-500/20">
            <button
              type="button"
              onClick={() => onClose()}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || title.trim() === "" || tags.length === 0}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
            >
              {saving
                ? "Saving..."
                : editingCourse
                ? "Update Course"
                : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}