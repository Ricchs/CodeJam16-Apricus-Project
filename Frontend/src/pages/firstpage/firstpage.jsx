import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import campusGroup from "./images/campus-group.jpg";
import campusWalk from "./images/campus-walk.jpg";
import campusClass from "./images/campus-class.jpg";
import campusRally from "./images/campus-rally.png";
import campusCommunity from "./images/campus-community.png";

const campusFeatures = [
  {
    title: "Campus voices",
    description: "Students and community members gather outdoors for a rally.",
    image: campusRally,
    alt: "People holding Palestinian flags and signs at an outdoor rally",
  },
  {
    title: "Campus community",
    description: "A group comes together for a photo on a snowy campus walkway.",
    image: campusCommunity,
    alt: "A group in matching blue shirts smiling and waving on a snowy walkway",
  },
];

const campusPhotos = [
  { src: campusGroup, alt: "Six McGill students posing together outside a campus building" },
  { src: campusWalk, alt: "Students walking along a tree-lined campus path" },
  { src: campusClass, alt: "Students giving thumbs-up in a classroom" },
];

function CampusSlideshow() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActiveIndex((index) => (index + 1) % campusPhotos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused]);

  function move(direction) {
    setPaused(true);
    setActiveIndex((index) => (index + direction + campusPhotos.length) % campusPhotos.length);
  }

  return (
    <section className="landing-slideshow" aria-label="Campus photo slideshow">
      <div className="landing-slideshow__frame" aria-live={paused ? "polite" : "off"}>
        {campusPhotos.map(({ src, alt }, index) => (
          <img key={src} src={src} alt={alt} hidden={index !== activeIndex} />
        ))}
      </div>
      <div className="landing-slideshow__controls">
        <button type="button" aria-label="Previous photo" onClick={() => move(-1)}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <div className="landing-slideshow__dots" aria-label="Choose a photo" role="group">
          {campusPhotos.map(({ src }, index) => (
            <button key={src} type="button" aria-label={`Show photo ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => {
                setPaused(true);
                setActiveIndex(index);
              }} />
          ))}
        </div>
        <button type="button" aria-label={paused ? "Play slideshow" : "Pause slideshow"}
          onClick={() => setPaused((current) => !current)}>
          {paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
        </button>
        <button type="button" aria-label="Next photo" onClick={() => move(1)}>
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export default function LandingPage({ onShowLogin, onShowSignup }) {
  return (
    <main className="landing">
      <header className="landing-nav">
        <strong>Apricus</strong>

        <nav aria-label="Account">
          <button type="button" onClick={onShowLogin}>
            Log in
          </button>
          <button type="button" onClick={onShowSignup}>
            Create an account
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <div>
          <h1>Find people to study with.</h1>
          <p>Find a study group, discover campus activities, and meet other McGill students.</p>
          <button type="button" onClick={onShowSignup}>
            Get started
          </button>
        </div>

        <CampusSlideshow />
      </section>

      <section className="landing-campus" aria-labelledby="campus-life">
        <h2 id="campus-life">Make more of campus life</h2>
        <div className="landing-campus__grid">
          {campusFeatures.map(({ title, description, image, alt }) => (
            <article className="landing-campus__card" key={title}>
              <img src={image} alt={alt} loading="lazy" decoding="async" />
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
