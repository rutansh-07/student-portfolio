import { lazy, Suspense } from "react";
import "./App.css";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Spinner from "./components/Spinner";

// Lazy load route pages for code splitting & faster initial load
const Home = lazy(() => import("./pages/Home"));
const Projects = lazy(() => import("./pages/Projects"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));

function App() {
  return (
    <>
      <Navbar />

      <Suspense fallback={<Spinner message="Loading page..." />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;