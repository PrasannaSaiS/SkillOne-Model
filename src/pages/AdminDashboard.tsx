
// SkillOne - Admin Dashboard (Complete Redesign)
// Purpose: Manage courses - Add, Edit, Delete


import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import AddCourseModal from "../components/AddCourseModal";


// TYPE DEFINITIONS

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  education_level: string;
  tags: string[];
  created_at: string;
}


// ADMIN DASHBOARD COMPONENT

export default function AdminDashboard() {

  // STATE MANAGEMENT

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "title">("recent");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);


  // DATA FETCHING

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
        setCourses([]);
      } else {
        setCourses(data || []);
      }
    } catch (e) {
      console.error("Exception:", e);
      setError("Failed to fetch courses");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // FILTER & SORT LOGIC

  const filteredCourses = courses
    .filter((course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0; //Keep original order (by created_at)
    });


  // EVENT HANDLERS

  const handleDelete = async (id: string) => {
    try {
      const { error: err } = await supabase.from("courses").delete().eq("id", id);
      if (err) throw err;
      setDeleteConfirmId(null);
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

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "Intermediate":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "Advanced":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };


  // RENDER - UI STRUCTURE


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-slate-800/80 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">⚙️</span>
            </div>
            <h1 className="text-2xl font-bold text-white hidden sm:block">
              Admin Panel
            </h1>
          </div>

          <button
            onClick={() => {
              setEditingCourse(null);
              setModalOpen(true);
            }}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
          >
            <span className="text-lg">Add a Course</span>
            <span className="hidden xs:inline">Add Course</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
            Course Management
          </h1>
          <p className="text-gray-300 text-lg">
            Create, edit, and manage your course library
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-xl p-6">
            <p className="text-gray-400 text-sm font-semibold mb-2">Total Courses</p>
            <p className="text-4xl font-bold text-purple-300">{courses.length}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border border-blue-500/30 rounded-xl p-6">
            <p className="text-gray-400 text-sm font-semibold mb-2">Beginner Level</p>
            <p className="text-4xl font-bold text-blue-300">
              {courses.filter((c) => c.difficulty_level === "Beginner").length}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-500/30 rounded-xl p-6">
            <p className="text-gray-400 text-sm font-semibold mb-2">Advanced Level</p>
            <p className="text-4xl font-bold text-orange-300">
              {courses.filter((c) => c.difficulty_level === "Advanced").length}
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
            <div>
              <p className="font-bold text-red-300">Error</p>
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "title")}
            className="bg-slate-800 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
          >
            <option value="recent">Recent</option>
            <option value="title">A-Z</option>
          </select>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300 font-semibold text-lg">Loading courses...</p>
            </div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-2xl font-bold text-white mb-2">No courses found</h3>
            <p className="text-gray-300 mb-6">
              {courses.length === 0
                ? "Start by creating your first course"
                : "No courses match your search"}
            </p>
            {courses.length === 0 && (
              <button
                onClick={() => {
                  setEditingCourse(null);
                  setModalOpen(true);
                }}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
              >
                <span>Create First Course</span>
                <span>+</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="group bg-gradient-to-r from-slate-800/50 to-slate-800/30 border border-purple-500/20 hover:border-purple-500/50 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
              >
                {/* Course Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-gray-300 text-sm line-clamp-2">
                      {course.description}
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(course)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(course.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Course Meta */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <span
                    className={`px-3 py-1.5 rounded-full text-sm font-bold border ${getDifficultyColor(
                      course.difficulty_level
                    )}`}
                  >
                    {course.difficulty_level}
                  </span>
                  <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full text-sm font-bold border border-indigo-500/30">
                    {course.education_level}
                  </span>
                  <span className="bg-gray-500/20 text-gray-300 px-3 py-1.5 rounded-full text-sm font-semibold border border-gray-500/30">
                    {course.tags?.length || 0} Topics
                  </span>
                </div>

                {/* Tags */}
                {course.tags && course.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-purple-600/30 text-purple-200 text-xs px-3 py-1 rounded-full border border-purple-500/30"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Delete Confirmation */}
                {deleteConfirmId === course.id && (
                  <div className="mt-4 bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-red-300 font-semibold">Delete this course?</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Course Modal */}
      {modalOpen && (
        <AddCourseModal
          {...({ editingCourse, onClose: () => handleModalClose(), onCourseAdded: () => handleModalClose(true) } as any)}
        />
      )}
    </div>
  );
}