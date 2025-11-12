import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import AddCourseModal from "../components/AddCourseModal";

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  education_level: string;
  tags: string[];
  created_at: string;
}

export default function AdminDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (err) {
        console.error("Error fetching courses:", err);
        setError(err.message);
        setCourses([]); // Ensure courses is always an array
      } else {
        setCourses(data || []); // Default to empty array if data is null
      }
    } catch (e) {
      console.error("Exception:", e);
      setError("Failed to fetch courses");
      setCourses([]); // Ensure courses is always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await supabase.from("courses").delete().eq("id", id);
      fetchCourses();
    } catch (e) {
      console.error("Delete error:", e);
      setError("Failed to delete course");
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setModalOpen(true);
  };

  const handleModalClose = (refresh?: boolean) => {
    setModalOpen(false);
    setEditingCourse(null);
    if (refresh) fetchCourses();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard - Courses</h1>
          <button
            className="bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700"
            onClick={() => {
              setEditingCourse(null);
              setModalOpen(true);
            }}
          >
            + Add Course
          </button>
        </header>

        {modalOpen && (
          <AddCourseModal
            course={editingCourse}
            onClose={handleModalClose}
          />
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading courses...</p>
          </div>
        ) : !courses || courses.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No courses found. Start by adding one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded shadow p-6 hover:shadow-lg transition">
                <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
                <p className="text-gray-600 text-sm mb-3">{course.description}</p>
                <div className="mb-3 text-sm">
                  <p><b>Difficulty:</b> <span className="text-blue-600">{course.difficulty_level}</span></p>
                  <p><b>Education Level:</b> {course.education_level}</p>
                </div>
                <div className="mb-4 flex flex-wrap gap-1">
                  {Array.isArray(course.tags) && course.tags.length > 0 ? (
                    course.tags.map((tag) => (
                      <span key={tag} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-xs">No tags</span>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(course)}
                    className="flex-1 bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this course?")) {
                        handleDelete(course.id);
                      }
                    }}
                    className="flex-1 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
