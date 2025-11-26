import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchLearningPaths, fetchCoursesByIds, fetchCourseMaterials, trackCourseInteraction } from "../services/learningPathService";

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  education_level: string;
  tags: string[];
  prerequisite_course_ids?: string[];  // ✅ ADDED - Optional field
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

export default function LearningPathView() {
  const { pathId } = useParams<{ pathId?: string }>();
  const navigate = useNavigate();
  
  const [learnerId] = useState(() => localStorage.getItem("learner_id") || "");
  const [path, setPath] = useState<LearningPath | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  useEffect(() => {
    loadPathData();
  }, [pathId, learnerId]);

  const loadPathData = async () => {
    try {
      setLoading(true);
      
      // Fetch all paths for this learner
      const paths = await fetchLearningPaths(learnerId);
      
      // Get the specific path (either by ID or the most recent)
      let targetPath: LearningPath | null = null;
      if (pathId) {
        targetPath = paths.find((p: LearningPath) => p.id === pathId) || null;
      } else {
        targetPath = paths[0] || null; // Most recent
      }
      
      if (!targetPath) {
        console.error("No learning path found");
        navigate("/learner");
        return;
      }
      
      setPath(targetPath);
      
      // Fetch courses in order
      const courseData = await fetchCoursesByIds(targetPath.course_sequence);
      
      // ✅ FIXED: Properly filter and map courses
      const sortedCourses: Course[] = targetPath.course_sequence
        .map((id: string) => {
          const course = courseData.find((c: any) => c.id === id);
          return course ? {
            id: course.id,
            title: course.title,
            description: course.description,
            difficulty_level: course.difficulty_level,
            education_level: course.education_level,
            tags: course.tags || [],
            prerequisite_course_ids: course.prerequisite_course_ids || []
          } as Course : null;
        })
        .filter((c): c is Course => c !== null);  // ✅ Type guard that TypeScript accepts
      
      setCourses(sortedCourses);
    } catch (err) {
      console.error("Error loading path:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const closeModal = () => {
    setSelectedCourse(null);
    setMaterials([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600">
        <div className="text-white text-2xl">Loading your learning path...</div>
      </div>
    );
  }

  if (!path || courses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600">
        <div className="text-center text-white">
          <h2 className="text-3xl font-bold mb-4">No Learning Path Found</h2>
          <button
            onClick={() => navigate("/learner")}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100"
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
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-indigo-600 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/learner")}
          className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition mb-8"
        >
          ← Back to Dashboard
        </button>

        {/* Header */}
        <div className="text-center text-white mb-12">
          <h1 className="text-5xl font-bold mb-4">Your Learning Journey</h1>
          <p className="text-xl opacity-90">Follow this personalized roadmap to achieve your goals</p>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-8 inline-block">
          <span className="text-purple-600 font-semibold">
            Step 1 of {courses.length} - Let&apos;s begin your journey!
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {courses.length}
            </div>
            <div className="text-gray-600 mt-2">Total Courses</div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {beginnerCount}
            </div>
            <div className="text-gray-600 mt-2">Beginner Friendly</div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {uniqueTags.length}
            </div>
            <div className="text-gray-600 mt-2">Topics Covered</div>
          </div>
        </div>

        {/* Reasoning */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-12 text-white">
          <p className="text-lg italic">&quot;{path.reasoning}&quot;</p>
        </div>

        {/* Vertical Roadmap */}
        <div className="relative pl-20">
          {/* Connecting Line */}
          <div className="absolute left-8 top-12 bottom-12 w-1 bg-gradient-to-b from-purple-400 to-indigo-400 rounded-full"></div>

          {/* Course Cards */}
          {courses.map((course, index) => (
            <div key={course.id} className="relative mb-8">
              {/* Number Circle */}
              <div className="absolute -left-12 top-6 w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-xl z-10">
                {index + 1}
              </div>

              {/* Course Card */}
              <div
                onClick={() => handleOpenCourse(course)}
                className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:translate-x-2 transition-all cursor-pointer"
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{course.title}</h3>
                <p className="text-gray-600 mb-4">{course.description}</p>
                
                <div className="flex gap-3 mb-4">
                  <span className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 px-4 py-2 rounded-full text-sm font-semibold">
                    {course.difficulty_level}
                  </span>
                  <span className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 px-4 py-2 rounded-full text-sm font-semibold">
                    {course.education_level}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {course.tags?.map((tag) => (
                    <span key={tag} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>

                <button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition">
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl p-10 max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-6 right-6 w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-2xl text-gray-600 transition hover:rotate-90"
            >
              ×
            </button>

            {/* Title */}
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              {selectedCourse.title}
            </h2>

            {/* Description */}
            <p className="text-gray-700 text-lg leading-relaxed mb-6">
              {selectedCourse.description}
            </p>

            {/* Meta Info */}
            <div className="flex gap-3 mb-6">
              <span className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 px-4 py-2 rounded-full font-semibold">
                {selectedCourse.difficulty_level}
              </span>
              <span className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 px-4 py-2 rounded-full font-semibold">
                {selectedCourse.education_level}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {selectedCourse.tags?.map((tag) => (
                <span key={tag} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-full">
                  {tag}
                </span>
              ))}
            </div>

            {/* Materials Section */}
            {loadingMaterials ? (
              <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-gray-600">Loading materials...</p>
              </div>
            ) : materials.length > 0 ? (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-900">📁 Course Materials</h3>
                <div className="space-y-3">
                  {materials.map((material) => (
                    <a
                      key={material.id}
                      href={material.material_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 bg-white p-4 rounded-lg hover:shadow-lg hover:translate-x-1 transition"
                    >
                      <span className="text-2xl">📄</span>
                      <span className="text-purple-600 font-semibold flex-1 hover:underline">
                        {material.material_name || material.material_type}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-gray-600">No materials available for this course</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}