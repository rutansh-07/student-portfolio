import Header from "../components/Header";
import About from "../components/About";
import Skills from "../components/Skills";
import Footer from "../components/Footer";

function Home() {

  const skills = [
    "HTML",
    "CSS",
    "JavaScript",
    "React",
    "Node.js",
    "Express",
    "PostgreSQL",
    "Git",
    "GitHub"
  ];

  return (
    <div className="container">

      <Header name="Rutansh Govardhan" />

      <div className="card">
        <About />
      </div>

      <div className="card">
        <Skills skillList={skills} />
      </div>

      <Footer />

    </div>
  );
}

export default Home;