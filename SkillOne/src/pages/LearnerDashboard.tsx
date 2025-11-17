import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import CreateLearningPathModal from "../components/CreateLearningPathModal";
import { API_BASE_URL } from "../config";
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
  course_sequence: string[];
  reasoning: string;
  created_at: string;
}

export default function LearnerDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const learnerId = `learner_${Date.now()}`; // Use actual learner ID from auth

  useEffect(() => {
    const fetchData = async () => {
      const { data: coursesData } = await supabase.from("courses").select("*");
      const { data: pathsData } = await supabase.from("learning_paths").select("*").eq("learner_id", learnerId);
      
      setCourses(coursesData || []);
      setLearningPaths(pathsData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Discover Courses</h1>
          <button
            className="bg-green-600 text-white px-5 py-2 rounded font-semibold hover:bg-green-700"
            onClick={() => setModalOpen(true)}
          >
            + Create Learning Path
          </button>
        </header>

        {modalOpen && <CreateLearningPathModal onClose={() => { setModalOpen(false); }} />}

        {/* My Learning Paths Section */}
        {learningPaths.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">📚 My Learning Paths</h2>
            <div className="space-y-4">
              {learningPaths.map((path) => (
                <div
                  key={path.id}
                  onClick={() => setSelectedPath(path)}
                  className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded cursor-pointer hover:shadow-lg transition"
                >
                  <h3 className="font-semibold">Learning Path ({path.course_sequence.length} courses)</h3>
                  <p className="text-sm text-gray-600 mt-1">{path.reasoning}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Discover Courses Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">🎓 Discover Courses</h2>
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className="bg-white rounded shadow p-4 cursor-pointer hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{course.difficulty_level}</span>
                    <span>{course.education_level}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Course Details Overlay */}
        {selectedCourse && (
          <CourseOverlay course={selectedCourse} onClose={() => setSelectedCourse(null)} />
        )}

        {/* Learning Path Visualization */}
        {selectedPath && (
          <LearningPathVisualization path={selectedPath} courses={courses} onClose={() => setSelectedPath(null)} />
        )}
      </div>
    </div>
  );
}

function CourseOverlay({ course, onClose }: { course: Course; onClose: () => void }) {
  const [materials, setMaterials] = useState<any[]>([]);

  useEffect(() => {
    const fetchMaterials = async () => {
      const { data } = await supabase.from("course_files").select("*").eq("course_id", course.id);
      setMaterials(data || []);
    };
    fetchMaterials();
  }, [course.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{course.title}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
        </div>
        <p className="text-gray-600 mb-3">{course.description}</p>
        <div className="mb-3">
          <p><b>Difficulty:</b> {course.difficulty_level}</p>
          <p><b>Education Level:</b> {course.education_level}</p>
        </div>
        <div className="mb-3">
          <b>Tags:</b>
          <div className="flex flex-wrap gap-1 mt-1">
            {course.tags.map((tag) => (
              <span key={tag} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                {tag}
              </span>
            ))}
          </div>
        </div>
        {materials.length > 0 && (
          <div className="mb-3">
            <b>Materials:</b>
            <ul className="list-disc list-inside mt-1">
              {materials.map((m) => (
                <li key={m.id}>
                  <a href={m.material_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    {m.material_name || m.material_type}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button onClick={onClose} className="w-full bg-blue-600 text-white py-2 rounded mt-4">
          Close
        </button>
      </div>
    </div>
  );
}

function LearningPathVisualization({ path, courses, onClose }: { path: LearningPath; courses: Course[]; onClose: () => void }) {
  const [selectedCourseInPath, setSelectedCourseInPath] = useState<Course | null>(null);
  const courseMap = new Map(courses.map(c => [c.id, c]));
  const pathCourses = path.course_sequence.map(id => courseMap.get(id)).filter(Boolean) as Course[];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Learning Path</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
        </div>

        <div className="space-y-4">
          {pathCourses.map((course, idx) => (
            <div key={course.id} className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                {idx + 1}
              </div>
              <div
                onClick={() => setSelectedCourseInPath(course)}
                className="flex-1 bg-blue-50 p-4 rounded cursor-pointer hover:bg-blue-100 transition"
              >
                <h3 className="font-semibold">{course.title}</h3>
                <p className="text-sm text-gray-600">{course.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">{course.difficulty_level}</span>
                  <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">{course.education_level}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedCourseInPath && (
          <CourseOverlay course={selectedCourseInPath} onClose={() => setSelectedCourseInPath(null)} />
        )}

        <button onClick={onClose} className="w-full bg-blue-600 text-white py-2 rounded mt-6">
          Close Path
        </button>
      </div>
    </div>
  );
}
