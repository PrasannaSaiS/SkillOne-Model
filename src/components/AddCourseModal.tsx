import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";

interface AddCourseModalProps {
  course?: any;
  onClose: (refresh?: boolean) => void;
}

type Material = {
  id?: string;
  material_type: string;
  material_url: string;
  material_name?: string;
};

export default function AddCourseModal({ course, onClose }: AddCourseModalProps) {
  const [title, setTitle] = useState(course?.title || "");
  const [description, setDescription] = useState(course?.description || "");
  const [difficulty, setDifficulty] = useState(course?.difficulty_level || "Beginner");
  const [education, setEducation] = useState(course?.education_level || "High School");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(course?.tags || []);
  const [materials, setMaterials] = useState<Material[]>([]);
  
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [selectedPrereqs, setSelectedPrereqs] = useState<string[]>(course?.prerequisite_course_ids || []);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from("courses").select("id, title");
      setAllCourses(data || []);
    };
    fetchCourses();

    // NEW: Fetch existing materials if editing
    if (course?.id) {
      const fetchMaterials = async () => {
        const { data } = await supabase
          .from("course_files")
          .select("*")
          .eq("course_id", course.id);
        if (data) {
          setMaterials(data.map(m => ({
            id: m.id,
            material_type: m.material_type,
            material_url: m.material_url,
            material_name: m.material_name,
          })));
        }
      };
      fetchMaterials();
    }
  }, [course?.id]);

  const handleAddTag = () => {
    const val = tagInput.trim();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setTagInput("");
    }
  };
  const handleRemoveTag = (t: string) => setTags(tags.filter(tag => tag !== t));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const filePath = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("course-materials")
        .upload(filePath, file);
      if (error) {
        alert("File upload failed: " + error.message);
        return;
      }
      const publicUrl = supabase.storage.from("course-materials").getPublicUrl(data?.path!).data.publicUrl;
      setMaterials([...materials, { material_type: "pdf", material_url: publicUrl, material_name: file.name }]);
    } catch {
      alert("Error uploading file");
    }
  };

  const [linkInput, setLinkInput] = useState("");
  const [linkType, setLinkType] = useState("youtube");
  const handleAddLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    setMaterials([...materials, { material_type: linkType, material_url: url, material_name: url }]);
    setLinkInput("");
  };
  const handleRemoveMaterial = (i: number) => setMaterials(materials.filter((_, ix) => ix !== i));

  const togglePrereq = (courseId: string) => {
    if (selectedPrereqs.includes(courseId)) {
      setSelectedPrereqs(selectedPrereqs.filter(id => id !== courseId));
    } else {
      setSelectedPrereqs([...selectedPrereqs, courseId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title,
      description,
      difficulty_level: difficulty,
      education_level: education,
      tags,
      prerequisite_course_ids: selectedPrereqs,
    };

    try {
      let courseId = course?.id;

      if (courseId) {
        await supabase.from("courses").update(payload).eq("id", courseId);
      } else {
        const { data, error } = await supabase.from("courses").insert([payload]).select();
        if (error || !data || data.length === 0) throw error || new Error("Failed to insert course");
        courseId = data[0].id;
      }

      if (courseId) {
        // Delete old materials
        await supabase.from("course_files").delete().eq("course_id", courseId);
        
        // Insert new/updated materials
        for (const m of materials) {
          await supabase.from("course_files").insert({
            course_id: courseId,
            material_type: m.material_type,
            material_url: m.material_url,
            material_name: m.material_name,
          });
        }
      }
      setSaving(false);
      onClose(true);
    } catch (err: any) {
      alert(err.message || "Failed to save course");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl max-h-[95vh] overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{course ? "Edit Course" : "Create New Course"}</h2>
          <button onClick={() => onClose()} className="text-gray-400 hover:text-gray-900 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block font-medium mb-1">Course Title *</label>
            <input className="w-full border px-3 py-2 rounded" placeholder="e.g., Python for Beginners"
              value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="block font-medium mb-1">Description *</label>
            <textarea className="w-full border px-3 py-2 rounded" rows={3} placeholder="Brief course description"
              value={description} onChange={e => setDescription(e.target.value)} required />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block font-medium mb-1">Difficulty Level *</label>
              <select className="w-full border px-3 py-2 rounded" value={difficulty}
                onChange={e => setDifficulty(e.target.value)} required>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Education Level *</label>
              <select className="w-full border px-3 py-2 rounded" value={education}
                onChange={e => setEducation(e.target.value)} required>
                <option value="High School">High School</option>
                <option value="Undergraduate">Undergraduate</option>
                <option value="Graduate">Graduate</option>
                <option value="Professional">Professional</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Course Tags (Skills/Topics) *</label>
            <div className="flex items-center gap-2">
              <input className="flex-1 border px-3 py-2 rounded" placeholder="e.g., Python, Data Science"
                value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} />
              <button type="button" className="bg-blue-600 text-white px-3 py-2 rounded" onClick={handleAddTag}>+ Add</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <span key={tag} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Prerequisite Courses</label>
            <div className="border rounded p-3 max-h-40 overflow-y-auto">
              {allCourses.filter(c => c.id !== course?.id).map((c) => (
                <label key={c.id} className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedPrereqs.includes(c.id)}
                    onChange={() => togglePrereq(c.id)}
                  />
                  {c.title}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Course Materials</label>
            <input type="file" accept=".pdf" onChange={handleFileChange} className="mb-2" />
            <div className="flex items-center gap-2 mb-2">
              <input type="text" value={linkInput} onChange={e => setLinkInput(e.target.value)}
                placeholder="Paste YouTube or web link" className="flex-1 border px-3 py-2 rounded" />
              <select value={linkType} onChange={e => setLinkType(e.target.value)} className="border px-2 rounded">
                <option value="youtube">YouTube</option>
                <option value="web">Web Link</option>
              </select>
              <button type="button" onClick={handleAddLink} className="bg-blue-600 text-white px-3 py-2 rounded">+ Add Link</button>
            </div>
            <div>
              {materials.length === 0 && <p className="text-gray-400 text-sm">No materials added yet</p>}
              <ul className="space-y-2">
                {materials.map((m, i) => (
                  <li key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <a href={m.material_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline flex-1 truncate">
                      [{m.material_type.toUpperCase()}] {m.material_name || m.material_url}
                    </a>
                    <button type="button" onClick={() => handleRemoveMaterial(i)} className="text-red-600 ml-2 hover:text-red-800 font-bold">
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" className="px-6 py-2 border rounded" onClick={() => onClose()} disabled={saving}>Cancel</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded" disabled={saving}>
              {saving ? "Saving..." : course ? "Update Course" : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}