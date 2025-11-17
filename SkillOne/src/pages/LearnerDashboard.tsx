import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import CreateLearningPathModal from "../components/CreateLearningPathModal";
import {
  fetchLearningPaths,
  fetchCoursesByIds,
  fetchCourseMaterials,
  trackCourseInteraction,
} from "../services/learningPathService";

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  education_level: string;
  tags: string[];
}

interface LearningPath {
  id: string;
  learner_id: string;
  course_sequence: string[];
  relevance_scores: Record<string, number>;
  reasoning: string;
  created_at: string;
}

export default function LearnerDashboard() {
  // Persistent learner ID (using localStorage)
  const [learnerId, setLearnerId] = useState(() => {
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
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pathCourses, setPathCourses] = useState<Course[]>([]);

  // Fetch learning paths and courses
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select(
          "id, title, description, difficulty_level, education_level, tags"
        );

      setCourses(coursesData || []);

      // Fetch learner's learning paths
      const paths = await fetchLearningPaths(learnerId);
      setLearningPaths(paths as LearningPath[]);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [learnerId]);

  const handleSelectPath = async (path: LearningPath) => {
    setSelectedPath(path);
    // Fetch course details for this path
    try {
      const courseData = await fetchCoursesByIds(path.course_sequence);
      setPathCourses(courseData as Course[]);
    } catch (err) {
      console.error("Error fetching path courses:", err);
    }
  };

  const handleTrackInteraction = async (
    courseId: string,
    type: "viewed" | "started" | "completed"
  ) => {
    await trackCourseInteraction(learnerId, courseId, type);
    console.log(`Tracked ${type} interaction`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Learning Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Learner ID: {learnerId}</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            + Create Learning Path
          </button>
        </div>

        {/* Learning Paths Section */}
        {learningPaths.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">My Learning Paths</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {learningPaths.map((path) => (
                <div
                  key={path.id}
                  onClick={() => handleSelectPath(path)}
                  className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-600 p-6 rounded-lg cursor-pointer hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-bold text-blue-900">
                    Learning Path
                  </h3>
                  <p className="text-sm text-gray-600 mt-2">
                    📊 {path.course_sequence.length} courses to master
                  </p>
                  <p className="text-sm text-gray-700 mt-2 italic">
                    "{path.reasoning}"
                  </p>
                  <p className="text-xs text-gray-500 mt-3">
                    Created: {new Date(path.created_at).toLocaleDateString()}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPath(path);
                    }}
                    className="mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    View Path →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discover Courses Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Discover Courses</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-600">
              Loading courses...
            </div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition"
                >
                  <h3 className="font-bold text-lg mb-2">{course.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {course.description?.substring(0, 100)}...
                  </p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      {course.difficulty_level}
                    </span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      {course.education_level}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {course.tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No courses available yet</p>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalOpen && (
        <CreateLearningPathModal
          learnerId={learnerId}
          onClose={() => setModalOpen(false)}
          onPathCreated={fetchData}
        />
      )}

      {selectedCourse && (
        <CourseOverlay
          course={selectedCourse}
          learnerId={learnerId}
          onClose={() => setSelectedCourse(null)}
          onTrackInteraction={handleTrackInteraction}
        />
      )}

      {selectedPath && pathCourses.length > 0 && (
        <LearningPathVisualization
          path={selectedPath}
          courses={pathCourses}
          learnerId={learnerId}
          onClose={() => {
            setSelectedPath(null);
            setPathCourses([]);
          }}
          onTrackInteraction={handleTrackInteraction}
        />
      )}
    </div>
  );
}

// ============== COURSE OVERLAY COMPONENT ==============
function CourseOverlay({
  course,
  learnerId,
  onClose,
  onTrackInteraction,
}: {
  course: Course;
  learnerId: string;
  onClose: () => void;
  onTrackInteraction: (courseId: string, type: any) => void;
}) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const data = await fetchCourseMaterials(course.id);
        setMaterials(data);
        await onTrackInteraction(course.id, "viewed");
      } catch (err) {
        console.error("Error fetching materials:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [course.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold">{course.title}</h2>
            <p className="text-gray-600">{course.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-yellow-50 p-3 rounded">
            <p className="text-sm text-gray-600">Difficulty</p>
            <p className="font-semibold">{course.difficulty_level}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <p className="text-sm text-gray-600">Education Level</p>
            <p className="font-semibold">{course.education_level}</p>
          </div>
        </div>

        {course.tags && course.tags.length > 0 && (
          <div className="mb-4">
            <p className="font-semibold mb-2">Topics:</p>
            <div className="flex flex-wrap gap-2">
              {course.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Loading materials...</p>
        ) : materials.length > 0 ? (
          <div className="mb-4">
            <p className="font-semibold mb-2">📁 Course Materials:</p>
            <ul className="space-y-2">
              {materials.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100"
                >
                  <span>📄</span>
                  <a
                    href={m.material_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex-1"
                  >
                    {m.material_name || m.material_type}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-gray-600 mb-4">No materials available</p>
        )}

        <button
          onClick={onClose}
          className="w-full bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ============== LEARNING PATH VISUALIZATION ==============
function LearningPathVisualization({
  path,
  courses,
  learnerId,
  onClose,
  onTrackInteraction,
}: {
  path: LearningPath;
  courses: Course[];
  learnerId: string;
  onClose: () => void;
  onTrackInteraction: (courseId: string, type: any) => void;
}) {
  const [selectedCourseInPath, setSelectedCourseInPath] = useState<Course | null>(
    null
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-96 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-2">Your Learning Path</h2>
        <p className="text-gray-600 mb-4 italic">"{path.reasoning}"</p>

        {/* Path Sequence Visualization */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-4">
            {courses.map((course, idx) => (
              <div
                key={course.id}
                className="min-w-max"
              >
                <button
                  onClick={() => {
                    setSelectedCourseInPath(course);
                    onTrackInteraction(course.id, "started");
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                  <div className="text-sm font-bold">Step {idx + 1}</div>
                  <div className="text-xs mt-1">{course.title}</div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-2xl font-bold text-blue-600">
              {courses.length}
            </p>
            <p className="text-sm text-gray-600">Total Courses</p>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <p className="text-2xl font-bold text-green-600">
              {courses.filter((c) => c.difficulty_level === "Beginner").length}
            </p>
            <p className="text-sm text-gray-600">Beginner Friendly</p>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <p className="text-2xl font-bold text-purple-600">
              {[...new Set(courses.flatMap((c) => c.tags || []))].length}
            </p>
            <p className="text-sm text-gray-600">Topics Covered</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
        >
          Close
        </button>
      </div>

      {selectedCourseInPath && (
        <CourseOverlay
          course={selectedCourseInPath}
          learnerId={learnerId}
          onClose={() => setSelectedCourseInPath(null)}
          onTrackInteraction={onTrackInteraction}
        />
      )}
    </div>
  );
}
