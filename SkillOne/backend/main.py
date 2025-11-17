from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import networkx as nx
from supabase import create_client
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(
    title="SkillOne API",
    description="AI-Driven Knowledge Graph Model for Personalized Learning Path Generation",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase = create_client(
    os.getenv("VITE_SUPABASE_URL", ""),
    os.getenv("VITE_VITE_SUPABASE_PUBLISHABLE_KEY", "")
)

# Lazy loading for ML models - only initialize when needed
class MLModels:
    _tfidf_vectorizer = None
    _semantic_model = None

    @classmethod
    def get_tfidf_vectorizer(cls):
        if cls._tfidf_vectorizer is None:
            logger.info("Initializing TF-IDF Vectorizer...")
            cls._tfidf_vectorizer = TfidfVectorizer(
                stop_words='english',
                max_features=500,
                ngram_range=(1, 2)
            )
        return cls._tfidf_vectorizer

    @classmethod
    def get_semantic_model(cls):
        if cls._semantic_model is None:
            logger.info("Loading Sentence Transformer model (this may take a minute)...")
            # Use CPU to avoid memory issues on free tiers
            cls._semantic_model = SentenceTransformer(
                'all-MiniLM-L6-v2',
                device='cpu'
            )
        return cls._semantic_model

# Pydantic models for request/response validation
class LearnerProfile(BaseModel):
    learner_id: str
    career_goal: str
    education_level: str
    desired_skills: List[str]
    interests: Optional[List[str]] = None
    proficiency_level: Optional[str] = "Beginner"

class LearningPathResponse(BaseModel):
    learning_path: List[str]
    scores: Dict[str, float]
    reasoning: str
    total_courses: int
    pathway_details: List[Dict]

# Health check endpoint
@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": "SkillMatrix API",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Test Supabase connection
        supabase.table("courses").select("id").limit(1).execute()
        return {
            "status": "healthy",
            "database": "connected",
            "ml_models": "ready"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@app.get("/api/career-goals/suggestions")
async def get_career_goal_suggestions(query: str):
    """Autocomplete career goals based on previous users' inputs"""
    try:
        if not query or len(query) < 2:
            return {"suggestions": []}

        response = supabase.table("career_goal_logs") \
            .select("career_goal, frequency") \
            .ilike("career_goal", f"%{query}%") \
            .order("frequency", desc=True) \
            .limit(10) \
            .execute()

        suggestions = [item["career_goal"] for item in response.data]
        return {"suggestions": suggestions}

    except Exception as e:
        logger.error(f"Error fetching career goal suggestions: {e}")
        return {"suggestions": [], "error": str(e)}

@app.post("/api/generate-learning-path", response_model=LearningPathResponse)
async def generate_learning_path(profile: LearnerProfile):
    """
    Advanced ML-based learning path generation:
    1. Semantic similarity matching (TF-IDF + Sentence Transformers)
    2. Education level and difficulty matching
    3. Knowledge graph construction (prerequisites DAG)
    4. Topological sort respecting constraints
    """
    try:
        logger.info(f"Generating learning path for learner: {profile.learner_id}")

        # Save learner profile
        await save_learner_profile(profile)

        # 1. FETCH COURSES AND BUILD KNOWLEDGE GRAPH
        courses_response = supabase.table("courses").select("*").execute()
        courses = courses_response.data

        if not courses:
            raise HTTPException(status_code=404, detail="No courses found in database")

        logger.info(f"Found {len(courses)} courses")

        # 2. SEMANTIC ANALYSIS - TF-IDF + Sentence Embeddings
        course_texts = [
            f"{c.get('title', '')} {c.get('description', '')} {' '.join(c.get('tags', []))}"
            for c in courses
        ]
        learner_text = f"{profile.career_goal} {' '.join(profile.desired_skills)} {' '.join(profile.interests or [])}"

        # TF-IDF Vectorization
        tfidf_vectorizer = MLModels.get_tfidf_vectorizer()
        tfidf_matrix = tfidf_vectorizer.fit_transform(course_texts + [learner_text])
        learner_tfidf = tfidf_matrix[-1]
        course_tfidf_vectors = tfidf_matrix[:-1]
        tfidf_similarities = cosine_similarity(learner_tfidf, course_tfidf_vectors)[0]

        # Semantic Embeddings (Sentence Transformers)
        logger.info("Computing semantic embeddings...")
        semantic_model = MLModels.get_semantic_model()
        course_embeddings = semantic_model.encode(
            course_texts,
            show_progress_bar=False,
            convert_to_numpy=True
        )
        learner_embedding = semantic_model.encode(
            learner_text,
            show_progress_bar=False,
            convert_to_numpy=True
        )
        semantic_similarities = cosine_similarity(
            [learner_embedding],
            course_embeddings
        )[0]

        # Combine similarities (weighted)
        combined_scores = 0.6 * tfidf_similarities + 0.4 * semantic_similarities

        # 3. EDUCATION & DIFFICULTY BOOSTING
        level_mapping = {
            "High School": 1,
            "Undergraduate": 2,
            "Graduate": 3,
            "Professional": 4
        }
        difficulty_mapping = {
            "Beginner": 1,
            "Intermediate": 2,
            "Advanced": 3
        }

        learner_level = level_mapping.get(profile.education_level, 2)

        for i, course in enumerate(courses):
            course_level = level_mapping.get(
                course.get('education_level', 'Undergraduate'),
                2
            )
            course_difficulty = difficulty_mapping.get(
                course.get('difficulty_level', 'Beginner'),
                1
            )

            # Boost if education level matches
            if abs(course_level - learner_level) <= 1:
                combined_scores[i] *= 1.3

            # Progressive difficulty: prefer beginner if learner is beginner
            if learner_level == 1 and course_difficulty == 1:
                combined_scores[i] *= 1.2
            elif learner_level >= 2 and course_difficulty >= 2:
                combined_scores[i] *= 1.1

        # 4. BUILD KNOWLEDGE GRAPH (DAG with prerequisites)
        G = nx.DiGraph()
        course_id_map = {course['id']: i for i, course in enumerate(courses)}

        for i, course in enumerate(courses):
            G.add_node(i, **course)

        # Add prerequisite edges
        for course in courses:
            course_idx = course_id_map[course['id']]
            prereq_ids = course.get('prerequisite_course_ids', [])

            if prereq_ids:
                for prereq_id in prereq_ids:
                    if prereq_id in course_id_map:
                        prereq_idx = course_id_map[prereq_id]
                        # Edge from course to prerequisite (prerequisite must come first)
                        G.add_edge(course_idx, prereq_idx)

        # 5. TOPOLOGICAL SORT WITH SCORING
        course_scores = {i: float(combined_scores[i]) for i in range(len(courses))}
        visited = set()
        path_stack = []

        def dfs(node):
            if node in visited:
                return
            visited.add(node)
            # Visit prerequisites first
            for prereq in G.successors(node):
                dfs(prereq)
            path_stack.append(node)

        # Sort by score, then traverse DAG
        sorted_indices = sorted(
            range(len(courses)),
            key=lambda i: course_scores[i],
            reverse=True
        )

        for idx in sorted_indices:
            if idx not in visited:
                dfs(idx)

        path_stack.reverse()  # Reverse to get prerequisites first

        # 6. FILTER & RETURN TOP COURSES
        # Only include courses with positive scores
        filtered_path = [
            courses[i]['id'] 
            for i in path_stack 
            if course_scores[i] > 0
        ][:12]  # Top 12 courses

        # Build pathway details
        pathway_details = []
        for course_id in filtered_path:
            course_idx = course_id_map[course_id]
            course = courses[course_idx]
            pathway_details.append({
                "id": course_id,
                "title": course.get('title', 'Untitled'),
                "difficulty_level": course.get('difficulty_level', 'Beginner'),
                "education_level": course.get('education_level', 'Undergraduate'),
                "score": round(course_scores[course_idx], 4),
                "tags": course.get('tags', [])
            })

        reasoning = (
            f"Learning path generated using hybrid semantic analysis "
            f"(TF-IDF + embeddings), education/difficulty matching, and "
            f"prerequisite-aware topological sorting. Matched skills: "
            f"{', '.join(profile.desired_skills[:3])}. "
            f"Career goal: {profile.career_goal}"
        )

        # Save learning path
        await save_learning_path(
            profile.learner_id,
            filtered_path,
            course_scores,
            reasoning
        )

        # Log career goal for suggestions
        await log_career_goal(profile.career_goal)

        logger.info(f"Generated path with {len(filtered_path)} courses")

        return LearningPathResponse(
            learning_path=filtered_path,
            scores={
                str(courses[i]['id']): float(course_scores[i])
                for i in path_stack
                if course_scores[i] > 0
            },
            reasoning=reasoning,
            total_courses=len(filtered_path),
            pathway_details=pathway_details
        )

    except Exception as e:
        logger.error(f"Error generating learning path: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/learning-paths/{learner_id}")
async def get_learning_paths(learner_id: str):
    """Fetch all learning paths for a learner"""
    try:
        response = supabase.table("learning_paths") \
            .select("*") \
            .eq("learner_id", learner_id) \
            .execute()

        return {"paths": response.data}

    except Exception as e:
        logger.error(f"Error fetching learning paths: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
async def save_learner_profile(profile: LearnerProfile):
    """Save or update learner profile"""
    try:
        response = supabase.table("learner_profiles").upsert({
            "learner_id": profile.learner_id,
            "career_goal": profile.career_goal,
            "education_level": profile.education_level,
            "desired_skills": profile.desired_skills,
            "interests": profile.interests or [],
            "proficiency_level": profile.proficiency_level,
        }).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error saving profile: {e}")

async def save_learning_path(
    learner_id: str,
    path: List[str],
    scores: Dict,
    reasoning: str
):
    """Save generated learning path"""
    try:
        # Delete existing paths for this learner
        supabase.table("learning_paths") \
            .delete() \
            .eq("learner_id", learner_id) \
            .execute()

        # Insert new path
        response = supabase.table("learning_paths").insert({
            "learner_id": learner_id,
            "course_sequence": path,
            "relevance_scores": {str(k): v for k, v in scores.items()},
            "reasoning": reasoning,
        }).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error saving path: {e}")

async def log_career_goal(career_goal: str):
    """Log career goal for suggestion improvements"""
    try:
        response = supabase.table("career_goal_logs") \
            .select("frequency") \
            .eq("career_goal", career_goal) \
            .execute()

        current = response.data[0]["frequency"] if response.data else 0

        supabase.table("career_goal_logs").upsert({
            "career_goal": career_goal,
            "frequency": current + 1,
        }).execute()
    except Exception as e:
        logger.error(f"Error logging career goal: {e}")

@app.post("/api/track-interaction")
async def track_interaction(
    learner_id: str,
    course_id: str,
    interaction_type: str,
    rating: Optional[int] = None
):
    """Track learner interactions for future collaborative filtering"""
    try:
        response = supabase.table("learner_course_interactions").insert({
            "learner_id": learner_id,
            "course_id": course_id,
            "interaction_type": interaction_type,
            "rating": rating,
        }).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Error tracking interaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)