// ============================================================================
// SkillOne - Learning Path View (Redesigned)
// Purpose: Display personalized learning path with course details
// Responsive: Mobile, Tablet, Laptop, Desktop
// ============================================================================

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchLearningPaths,
  fetchCoursesByIds,
  fetchCourseMaterials,
  trackCourseInteraction,
} from "../services/learningPathService";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

interface Material {
  id: string;
  material_type: string;
  material_url: string;
  material_name: string | null;
}

// ============================================================================
// LEARNING PATH VIEW COMPONENT
// ============================================================================

export default function LearningPathView() {
  const { pathId } = useParams<{ pathId?: string }>();
  const navigate = useNavigate();

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  const [learnerId] = useState(() => localStorage.getItem("learner_id") || "");
  const [path, setPath] = useState<LearningPath | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [completedCourses, setCompletedCourses] = useState<Set<string>>(new Set());

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  const loadPathData = async () => {
    try {
      setLoading(true);

      // Fetch all paths
      const paths = await fetchLearningPaths(learnerId);

      // Get specific path
      let targetPath: LearningPath | null = null;
      if (pathId) {
        targetPath = paths.find((p: LearningPath) => p.id === pathId) || null;
      } else {
        targetPath = paths[0] || null;
      }

      if (!targetPath) {
        navigate("/learner");
        return;
      }

      setPath(targetPath);

      // Fetch courses
      const courseData = await fetchCoursesByIds(targetPath.course_sequence);
      const sortedCourses = targetPath.course_sequence.flatMap((id: string) => {
        const course = courseData.find((c: any) => c.id === id);
        if (!course) return [];
        return [
          {
            id: course.id,
            title: course.title,
            description: course.description,
            difficulty_level: course.difficulty_level,
            education_level: course.education_level,
            tags: course.tags || [],
            prerequisite_course_ids: course.prerequisite_course_ids || [],
          },
        ];
      });

      setCourses(sortedCourses);
    } catch (err) {
      console.error("Error loading path:", err);
      navigate("/learner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPathData();
  }, [pathId, learnerId]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleOpenCourse = async (course: Course) => {
    setSelectedCourse(course);
    setLoadingMaterials(true);
    try {
      const mats = await fetchCourseMaterials(course.id);
      setMaterials(mats);
      await trackCourseInteraction(learnerId, course.id, "viewed");
    } catch (err) {
      console.error("Error loading materials:", err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleMarkComplete = (courseId: string) => {
    const updated = new Set(completedCourses);
    if (updated.has(courseId)) {
      updated.delete(courseId);
    } else {
      updated.add(courseId);
    }
    setCompletedCourses(updated);
  };

  const progressPercentage = (completedCourses.size / courses.length) * 100;

  // ========================================================================
  // RENDER - UI STRUCTURE
  // ========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 font-semibold text-lg">Loading your learning path...</p>
        </div>
      </div>
    );
  }

  if (!path || courses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-3xl font-bold text-white mb-4">No Path Found</h2>
          <p className="text-gray-300 mb-8">This learning path doesn't exist.</p>
          <button
            onClick={() => navigate("/learner")}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-bold hover:shadow-lg transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const beginnerCount = courses.filter((c) => c.difficulty_level === "Beginner").length;
  const uniqueTags = [...new Set(courses.flatMap((c) => c.tags || []))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-slate-800/80 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button
            onClick={() => navigate("/learner")}
            className="flex items-center gap-2 text-purple-300 hover:text-purple-200 font-semibold transition-colors"
          >
            <span>←</span>
            <span className="hidden xs:inline">Back</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Your Learning Journey</h1>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
            ✨
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Your Personalized <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Roadmap</span>
          </h2>
          <p className="text-gray-300 text-lg mb-6">
            Follow this intelligent path to achieve your learning goals
          </p>

          {/* Progress Bar */}
          <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-bold">Your Progress</span>
              <span className="text-purple-300 font-bold">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-3 text-sm text-gray-400">
              <span>{completedCourses.size} of {courses.length} completed</span>
              <span>{beginnerCount} Beginner • {uniqueTags.length} Topics</span>
            </div>
          </div>
        </div>

        {/* Reasoning Card */}
        <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-xl p-6 mb-12">
          <p className="text-gray-300 italic text-lg leading-relaxed">
            <span className="text-purple-300 font-bold">💡 Why this path?</span> {path.reasoning}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-2">Total Courses</p>
            <p className="text-4xl font-bold text-purple-300">{courses.length}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border border-blue-500/30 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-2">Beginner Friendly</p>
            <p className="text-4xl font-bold text-blue-300">{beginnerCount}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm mb-2">Topics Covered</p>
            <p className="text-4xl font-bold text-emerald-300">{uniqueTags.length}</p>
          </div>
        </div>

        {/* Vertical Course Path */}
        <section>
          <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-indigo-600 rounded"></div>
            Course Sequence
          </h3>

          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-indigo-500 to-purple-500 rounded-full"></div>

            {/* Course Cards */}
            <div className="space-y-6">
              {courses.map((course, index) => (
                <div key={course.id} className="relative pl-16 sm:pl-20">
                  {/* Number Circle */}
                  <div className="absolute -left-3 top-0 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg">
                    <span className="text-white font-bold text-2xl">{index + 1}</span>
                  </div>

                  {/* Course Card */}
                  <div
                    onClick={() => handleOpenCourse(course)}
                    className="group bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-purple-500/30 hover:border-purple-500/60 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors mb-2">
                          {course.title}
                        </h4>
                        <p className="text-gray-300 text-sm line-clamp-2">
                          {course.description}
                        </p>
                      </div>

                      {/* Completion Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkComplete(course.id);
                        }}
                        className={`ml-4 px-4 py-2 rounded-lg font-bold transition-all transform hover:scale-110 ${
                          completedCourses.has(course.id)
                            ? "bg-green-600 text-white"
                            : "bg-gray-600 text-gray-200 hover:bg-gray-700"
                        }`}
                      >
                        {completedCourses.has(course.id) ? "✓ Done" : "⭕"}
                      </button>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-3 py-1 rounded-full border border-yellow-500/30">
                        {course.difficulty_level}
                      </span>
                      <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30">
                        {course.education_level}
                      </span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {course.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="bg-purple-600/30 text-purple-200 text-xs px-2.5 py-1 rounded-lg border border-purple-500/30"
                        >
                          #{tag}
                        </span>
                      ))}
                      {course.tags && course.tags.length > 3 && (
                        <span className="bg-purple-600/30 text-purple-200 text-xs px-2.5 py-1 rounded-lg border border-purple-500/30">
                          +{course.tags.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Relevance Score */}
                    {path.relevance_scores[course.id] && (
                      <div className="mt-4 pt-4 border-t border-purple-500/20">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Relevance Match</span>
                          <span className="text-purple-300 font-bold">
                            {Math.round(path.relevance_scores[course.id] * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2 mt-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full"
                            style={{
                              width: `${path.relevance_scores[course.id] * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* View Details Button */}
                    <button
                      onClick={() => handleOpenCourse(course)}
                      className="mt-4 w-full text-purple-300 hover:text-purple-200 font-semibold transition-colors flex items-center justify-center gap-2 group-hover:gap-3"
                    >
                      <span>View Details</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/20">
                  <p className="text-gray-400 text-sm mb-1">Difficulty</p>
                  <p className="text-white font-bold">{selectedCourse.difficulty_level}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/20">
                  <p className="text-gray-400 text-sm mb-1">Education Level</p>
                  <p className="text-white font-bold">{selectedCourse.education_level}</p>
                </div>
              </div>

              {/* Tags */}
              {selectedCourse.tags && selectedCourse.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-purple-300 mb-3">Topics Covered</h3>
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

              {/* Materials Section */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-purple-300 mb-3">📁 Course Materials</h3>
                {loadingMaterials ? (
                  <div className="text-center py-6">
                    <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-300">Loading materials...</p>
                  </div>
                ) : materials.length > 0 ? (
                  <div className="space-y-2">
                    {materials.map((material) => (
                      <a
                        key={material.id}
                        href={material.material_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-slate-700/50 hover:bg-slate-700 border border-purple-500/20 hover:border-purple-500/50 rounded-lg p-4 transition-all"
                      >
                        <p className="text-purple-300 font-semibold flex items-center gap-2">
                          <span>📄</span>
                          {material.material_name || material.material_type}
                        </p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No materials available for this course</p>
                )}
              </div>

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
    </div>
  );
}