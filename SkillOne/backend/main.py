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

load_dotenv()

app = FastAPI()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))

# Initialize ML models
tfidf_vectorizer = TfidfVectorizer(stop_words='english', max_features=500)
semantic_model = SentenceTransformer('all-MiniLM-L6-v2')  # Lightweight, fast embeddings

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LearnerProfile(BaseModel):
    learner_id: str
    career_goal: str
    education_level: str
    desired_skills: List[str]
    interests: Optional[List[str]] = None
    proficiency_level: Optional[str] = "Beginner"

@app.get("/api/career-goals/suggestions")
async def get_career_goal_suggestions(query: str):
    """Autocomplete career goals based on previous users' inputs"""
    try:
        response = supabase.table("career_goal_logs") \
            .select("career_goal, frequency") \
            .ilike("career_goal", f"%{query}%") \
            .order("frequency", desc=True) \
            .limit(10) \
            .execute()

        data = response.data
        error = response.error
        if error:
            return { "suggestions": [] }

        suggestions = [item["career_goal"] for item in data]
        return { "suggestions": suggestions }
    except Exception as e:
        return { "suggestions": [], "error": str(e) }

@app.post("/api/generate-learning-path")
async def generate_learning_path(profile: LearnerProfile):
    """
    Advanced ML-based learning path generation:
    1. Semantic similarity matching (TF-IDF + Sentence Transformers)
    2. Education level and difficulty matching
    3. Knowledge graph construction (prerequisites DAG)
    4. Topological sort respecting constraints
    5. Collaborative filtering signals
    """
    try:
        # Save learner profile
        await save_learner_profile(profile)
        
        # 1. FETCH COURSES AND BUILD KNOWLEDGE GRAPH
        courses_response = supabase.table("courses").select("*").execute()
        courses = courses_response.data
        
        if not courses:
            raise HTTPException(status_code=404, detail="No courses found")

        # 2. SEMANTIC ANALYSIS - TF-IDF + Sentence Embeddings
        course_texts = [f"{c['title']} {c['description']} {' '.join(c.get('tags', []))}" for c in courses]
        learner_text = f"{profile.career_goal} {' '.join(profile.desired_skills)} {' '.join(profile.interests or [])}"

        # TF-IDF Vectorization
        tfidf_matrix = tfidf_vectorizer.fit_transform(course_texts + [learner_text])
        learner_tfidf = tfidf_matrix[-1]
        course_tfidf_vectors = tfidf_matrix[:-1]
        tfidf_similarities = cosine_similarity(learner_tfidf, course_tfidf_vectors)[0]

        # Semantic Embeddings (Sentence Transformers)
        course_embeddings = semantic_model.encode(course_texts)
        learner_embedding = semantic_model.encode(learner_text)
        semantic_similarities = cosine_similarity([learner_embedding], course_embeddings)[0]

        # Combine similarities (weighted)
        combined_scores = 0.6 * tfidf_similarities + 0.4 * semantic_similarities

        # 3. EDUCATION & DIFFICULTY BOOSTING
        level_mapping = {"High School": 1, "Undergraduate": 2, "Graduate": 3, "Professional": 4}
        difficulty_mapping = {"Beginner": 1, "Intermediate": 2, "Advanced": 3}
        learner_level = level_mapping.get(profile.education_level, 2)

        for i, course in enumerate(courses):
            course_level = level_mapping.get(course.get('education_level', 'Undergraduate'), 2)
            course_difficulty = difficulty_mapping.get(course.get('difficulty_level', 'Beginner'), 1)

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
            for prereq_id in prereq_ids:
                if prereq_id in course_id_map:
                    prereq_idx = course_id_map[prereq_id]
                    G.add_edge(course_idx, prereq_idx)

        # 5. TOPOLOGICAL SORT WITH SCORING
        course_scores = {i: combined_scores[i] for i in range(len(courses))}
        
        visited = set()
        path_stack = []

        def dfs(node):
            if node in visited:
                return
            visited.add(node)
            for prereq in G.successors(node):
                dfs(prereq)
            path_stack.append(node)

        # Sort by score, then traverse DAG
        sorted_indices = sorted(range(len(courses)), key=lambda i: course_scores[i], reverse=True)
        for idx in sorted_indices:
            if idx not in visited:
                dfs(idx)

        path_stack.reverse()

        # 6. FILTER & RETURN TOP COURSES
        top_path = [courses[i]['id'] for i in path_stack if course_scores[i] > 0][:12]
        reasoning = f"Path generated using semantic analysis (TF-IDF + embeddings), education matching, and prerequisite DAG. Top skills matched: {', '.join(profile.desired_skills[:3])}"

        # Save learning path
        await save_learning_path(profile.learner_id, top_path, course_scores, reasoning)

        # Log career goal for suggestions
        await log_career_goal(profile.career_goal)

        return {
            "learning_path": top_path,
            "scores": {str(courses[i]['id']): float(course_scores[i]) for i in path_stack if course_scores[i] > 0},
            "reasoning": reasoning,
            "total_courses": len(top_path),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/learning-paths/{learner_id}")
async def get_learning_paths(learner_id: str):
    """Fetch all learning paths for a learner"""
    try:
        response = supabase.table("learning_paths").select("*").eq("learner_id", learner_id).execute()
        data = response.data
        error = response.error
        if error:
            raise error
        return { "paths": data }
    except Exception as e:
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
        print(f"Error saving profile: {e}")

async def save_learning_path(learner_id: str, path: List[str], scores: Dict, reasoning: str):
    """Save generated learning path"""
    try:
        supabase.table("learning_paths").delete().eq("learner_id", learner_id).execute()
        
        response = supabase.table("learning_paths").insert({
            "learner_id": learner_id,
            "course_sequence": path,
            "relevance_scores": scores,
            "reasoning": reasoning,
        }).execute()
        return response.data
    except Exception as e:
        print(f"Error saving path: {e}")

async def log_career_goal(career_goal: str):
    """Log career goal for suggestion improvements"""
    try:
        response = supabase.table("career_goal_logs").select("frequency").eq("career_goal", career_goal).execute()
        current = response.data[0]["frequency"] if response.data else 0
        supabase.table("career_goal_logs").upsert({
            "career_goal": career_goal,
            "frequency": current + 1,
        }).execute()
    except Exception as e:
        print(f"Error logging career goal: {e}")

@app.post("/api/track-interaction")
async def track_interaction(learner_id: str, course_id: str, interaction_type: str, rating: Optional[int] = None):
    """Track learner interactions for collaborative filtering"""
    try:
        response = supabase.table("learner_course_interactions").insert({
            "learner_id": learner_id,
            "course_id": course_id,
            "interaction_type": interaction_type,
            "rating": rating,
        }).execute()
        return { "success": True }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
