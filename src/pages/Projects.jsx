import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";
import { getTasks } from "../api";

function Projects() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getTasks()
      .then((data) => {
        if (Array.isArray(data)) {
          setTasks(data);
        } else {
          setTasks([]);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch tasks from backend");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const projects = [
    {
      title: "Talent Intelligence Platform",
      status: "In Progress",
      description:
        "An AI-powered placement platform that analyzes resumes, recommends career paths, identifies skill gaps and helps recruiters discover talent.",
      technologies: [
        "React",
        "Node.js",
        "PostgreSQL",
        "Prisma",
        "Gemini AI"
      ]
    },
    // {
    //   title: "TransitOps",
    //   status: "Hackathon Project",
    //   description:
    //     "A smart transport management platform with multiple dashboards, fleet monitoring and analytics developed during a hackathon.",
    //   technologies: [
    //     "React",
    //     "Tailwind",
    //     "PostgreSQL"
    //   ]
    // },
    {
      title: "Student Portfolio & Task Manager",
      status: "Completed",
      description:
        "A full-stack responsive portfolio and task management web application built with React, Node.js, Express, MongoDB, and Event-Driven Architecture, fully containerized with Docker and automated via GitHub Actions CI/CD pipelines.",
      technologies: [
        "React",
        "React Router",
        "Node.js",
        "Express",
        "MongoDB",
        "Docker",
        "GitHub Actions",
        "CI/CD"
      ]
    }
  ];

  return (
    <div className="container">
      <h1 className="page-title">Featured Projects</h1>

      <div className="projects-grid">
        {projects.map((project, index) => (
          <div className="project-card" key={index}>
            <span className="status">{project.status}</span>
            <h2>{project.title}</h2>
            <p>{project.description}</p>
            <div className="tech-stack">
              {project.technologies.map((tech, i) => (
                <span className="tech-badge" key={i}>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "60px", marginBottom: "30px", textAlign: "center" }}>
        <h1 className="page-title" style={{ marginBottom: "10px" }}>Tasks from Backend</h1>
        <p style={{ color: "#6b7280", fontSize: "16px" }}>
          Live task data fetched directly from your Node + MongoDB backend (Replacing Practical 3 GitHub repo data)
        </p>
        <Link 
          to="/tasks"
          style={{
            display: "inline-block",
            marginTop: "12px",
            padding: "8px 20px",
            backgroundColor: "#2563eb",
            color: "white",
            borderRadius: "20px",
            textDecoration: "none",
            fontWeight: "600",
            fontSize: "14px"
          }}
        >
          Open Task Manager (Full CRUD) ➜
        </Link>
      </div>

      {loading ? (
        <Spinner message="Loading Tasks from MongoDB..." />
      ) : error ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <ErrorMessage message={error} />
          <p style={{ marginTop: "15px", color: "#6b7280" }}>
            Ensure your backend server is running on port 5000 and connected to MongoDB.
          </p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#6b7280", fontSize: "16px", marginBottom: "15px" }}>
            No tasks found in MongoDB. Create your first task using the Task Manager!
          </p>
          <Link 
            to="/tasks"
            style={{
              padding: "10px 22px",
              backgroundColor: "#2563eb",
              color: "white",
              borderRadius: "20px",
              textDecoration: "none",
              fontWeight: "600"
            }}
          >
            Create Task Now
          </Link>
        </div>
      ) : (
        <div className="projects-grid">
          {tasks.map((task) => (
            <div className="project-card" key={task._id} style={{ opacity: task.completed ? 0.85 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span className="status" style={{ backgroundColor: task.completed ? "#10b981" : "#f59e0b", margin: 0 }}>
                  {task.completed ? "✓ Completed" : "⏳ Pending"}
                </span>
                <span style={{ 
                  fontSize: "11px", 
                  fontWeight: "700", 
                  textTransform: "uppercase", 
                  color: task.priority === "high" ? "#ef4444" : task.priority === "medium" ? "#f59e0b" : "#10b981",
                  background: task.priority === "high" ? "#fee2e2" : task.priority === "medium" ? "#fef3c7" : "#d1fae5",
                  padding: "4px 8px", 
                  borderRadius: "10px" 
                }}>
                  {task.priority || "low"} Priority
                </span>
              </div>

              <h2>{task.title}</h2>

              <p>{task.description || "No description provided"}</p>

              <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "10px" }}>
                Created: {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "Recently"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Projects;