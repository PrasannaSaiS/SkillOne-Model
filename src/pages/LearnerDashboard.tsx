
// SkillOne - Learner Dashboard (Complete Redesign)
// Purpose: Display personalized learning paths and course library
// Responsive: Mobile, Tablet, Laptop, Desktop


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import CreateLearningPathModal from "../components/CreateLearningPathModal";


// TYPE DEFINITIONS


interface Course {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  education_level: string;
  tags: string[];
  prerequisite_course_ids?: string[];
}

interface LearningPath {
  id: string;
  learner_id: string;
  course_sequence: string[];
  relevance_scores: Record<string, number>;
  reasoning: string;
  created_at: string;
}


// LEARNER DASHBOARD COMPONENT


export default function LearnerDashboard() {
  const navigate = useNavigate();

  
  // STATE MANAGEMENT
  

  const [learnerId] = useState(() => {
    const stored = localStorage.getItem("learner_id");
    if (stored) return stored;

    const newId = `learner_${Date.now()}`;
    localStorage.setItem("learner_id", newId);
    return newId;
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("All");

  
  // DATA FETCHING
  

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, title, description, difficulty_level, education_level, tags, prerequisite_course_ids");

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Fetch learning paths
      const { data: pathsData, error: pathsError } = await supabase
        .from("learning_paths")
        .select("*")
        .eq("learner_id", learnerId)
        .order("created_at", { ascending: false });

      if (pathsError) {
        console.error("Error fetching paths:", pathsError);
      } else {
        setLearningPaths(pathsData || []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [learnerId]);

  
  // FILTER & SEARCH LOGIC
  

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty =
      filterDifficulty === "All" || course.difficulty_level === filterDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  
  // EVENT HANDLERS
  

  const handleViewPath = (pathId: string) => {
    navigate(`/learning-path/${pathId}`);
  };

  
  // RENDER - UI STRUCTURE
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-slate-800/80 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <h1 className="text-2xl font-bold text-white hidden sm:block">
              SkillOne
            </h1>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
          >
            <span className="text-lg">Create Learning Path</span>
            <span className="hidden xs:inline">Create Path</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
            Your Learning <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Journey</span>
          </h1>
          <p className="text-gray-300 text-lg">
            Follow personalized learning roadmaps to master new skills
          </p>
        </div>

        {/* Learning Paths Section */}
        {learningPaths.length > 0 ? (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-indigo-600 rounded"></div>
              <h2 className="text-3xl font-bold text-white">My Learning Paths</h2>
              <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                {learningPaths.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
              {learningPaths.map((path, index) => (
                <div
                  key={path.id}
                  className="group bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/30 hover:border-purple-500/60 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20"
                >
                  {/* Path Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <span className="bg-purple-600 text-white px-4 py-1.5 rounded-full text-sm font-bold">
                      Path #{index + 1}
                    </span>
                  </div>

                  {/* Path Info */}
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Your Personalized Roadmap
                  </h3>

                  <div className="flex items-center gap-2 mb-4 text-gray-300">
                    <span className="font-semibold">
                      {path.course_sequence?.length || 0} courses
                    </span>
                  </div>

                  {/* Reasoning */}
                  <p className="text-gray-300 mb-6 italic line-clamp-2 text-sm">
                    &quot;{path.reasoning}&quot;
                  </p>

                  {/* Date */}
                  <p className="text-gray-400 text-xs mb-6">
                    Created: {new Date(path.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>

                  {/* View Button */}
                  <button
                    onClick={() => handleViewPath(path.id)}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform group-hover:translate-x-1 flex items-center justify-center gap-2"
                  >
                    <span>View My Path</span>
                    <span className="text-lg">→</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="mb-16 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border-2 border-dashed border-purple-500/50 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">No Learning Paths Yet</h3>
            <p className="text-gray-300 mb-6">
              Click the <strong>&quot;Create Path&quot;</strong> button to generate your first personalized learning roadmap!
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:shadow-lg transition-all inline-flex items-center gap-2"
            >
              <span>Create Your First Path</span>
              <span>✨</span>
            </button>
          </section>
        )}

        {/* Discover Courses Section */}
        <section>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-indigo-600 rounded"></div>
              <h2 className="text-3xl font-bold text-white">Discover Courses</h2>
            </div>
            <span className="bg-purple-600/30 text-purple-200 px-4 py-2 rounded-lg font-semibold">
              {filteredCourses.length} Available
            </span>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            {/* Search Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            {/* Difficulty Filter */}
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="bg-slate-800 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
            >
              <option value="All">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300 font-semibold">Loading courses...</p>
              </div>
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className="group bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-purple-500/20 hover:border-purple-500/60 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-white flex-1 group-hover:text-purple-300 transition-colors">
                      {course.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  {/* Meta Info */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <span className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-2.5 py-1 rounded-full border border-yellow-500/30">
                      {course.difficulty_level}
                    </span>
                    <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-500/30">
                      {course.education_level}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-2 flex-wrap">
                    {course.tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="bg-purple-600/30 text-purple-200 text-xs px-2 py-1 rounded-lg border border-purple-500/30"
                      >
                        {tag}
                      </span>
                    ))}
                    {course.tags && course.tags.length > 2 && (
                      <span className="bg-purple-600/30 text-purple-200 text-xs px-2 py-1 rounded-lg border border-purple-500/30">
                        +{course.tags.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No courses found matching your search</p>
            </div>
          )}
        </section>
      </main>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCourse(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 flex justify-between items-start p-6 border-b border-purple-500/20 bg-slate-800/95 backdrop-blur">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedCourse.title}</h2>
                <p className="text-gray-400 text-sm mt-1">Course Details</p>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="text-gray-400 hover:text-white transition-colors text-2xl w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-purple-300 mb-2">About</h3>
                <p className="text-gray-300 leading-relaxed">{selectedCourse.description}</p>
              </div>

              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/20">
                  <p className="text-gray-400 text-sm mb-1">Difficulty Level</p>
                  <p className="text-white font-bold text-lg">{selectedCourse.difficulty_level}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/20">
                  <p className="text-gray-400 text-sm mb-1">Education Level</p>
                  <p className="text-white font-bold text-lg">{selectedCourse.education_level}</p>
                </div>
              </div>

              {/* Tags */}
              {selectedCourse.tags && selectedCourse.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-purple-300 mb-3">Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCourse.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-purple-600/30 text-purple-200 px-4 py-2 rounded-lg border border-purple-500/30 font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedCourse(null)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Learning Path Modal */}
      {modalOpen && (
        <CreateLearningPathModal
          learnerId={learnerId}
          onClose={() => setModalOpen(false)}
          onPathCreated={() => {
            setModalOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}