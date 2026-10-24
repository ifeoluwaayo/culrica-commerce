"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Pause, Play } from "lucide-react";
import { useReducedMotion } from "motion/react";

const stories = [
  { title: "Connecting African", secondLine: "harvests from", emphasis: "Local to Global", description: "Exceptional produce. Direct connections. Discover a simpler way to source agricultural ingredients and grow your business.", image: "/images/hero-farm.jpg", alt: "Golden light across productive agricultural fields", preview: "A world of produce, closer to you", previewDescription: "Discover hibiscus, ginger and sesame from Nigeria’s growing regions.", video: "/media/supply-chain.mp4" },
  { title: "Growing opportunity", secondLine: "through", emphasis: "Commerce", description: "From your first kilogram to your next bulk order. Find quality ingredients, transparent prices and the right connections for your business.", image: "/images/hero-market.jpg", alt: "Agricultural produce being sorted at a market", preview: "Trade that starts at the source", previewDescription: "Know where your ingredients come from. Build your next order with confidence." },
  { title: "Better ingredients.", secondLine: "Bigger", emphasis: "Possibilities", description: "Bring your next idea to life with agricultural produce from local growing communities. Your next opportunity starts here.", image: "/images/hero-warehouse.jpg", alt: "Agricultural goods prepared for distribution", preview: "From local roots to global reach", previewDescription: "Connecting the richness of our land with the ambition of your business." }
];

export function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const video = useRef<HTMLVideoElement>(null);
  const story = stories[current];
  const nextIndex = (current + 1) % stories.length;

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setInterval(() => setCurrent(value => (value + 1) % stories.length), 14000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, current]);

  useEffect(() => {
    if (paused || reducedMotion) video.current?.pause();
    else video.current?.play().catch(() => {});
  }, [paused, reducedMotion, current]);

  return (
    <section className="story-hero" aria-roledescription="carousel" aria-label="Discover Culrica">
      <div className="story-media" key={story.image}>
        <Image src={story.image} alt={story.alt} fill priority sizes="100vw" className="object-cover" />
        {story.video && !reducedMotion && <video ref={video} className="story-video" autoPlay muted loop playsInline preload="metadata" poster={story.image} aria-hidden="true"><source src={story.video} type="video/mp4" /></video>}
      </div>
      <div className="story-overlay" />
      <div className="story-content" key={current}>
        <h1>{story.title}<br />{story.secondLine}<br /><em>{story.emphasis}</em></h1>
        <p>{story.description}</p>
        <Link href="/#catalogue" className="story-cta"><ArrowRight size={15} strokeWidth={1.5} /> Explore the marketplace</Link>
      </div>
      <button className="story-preview" onClick={() => setCurrent(nextIndex)} aria-label={`Next story: ${stories[nextIndex].title} ${stories[nextIndex].emphasis}`}>
        <div className="story-preview-image"><Image src={stories[nextIndex].image} alt="" fill sizes="(max-width: 767px) 38vw, 280px" className="object-cover" /></div>
        <div className="story-preview-copy"><h2>{story.preview}</h2><p>{story.previewDescription}</p><span>Next story <ArrowRight size={12} /></span></div>
      </button>
      <Link className="story-explore" href="#impact"><span className="scroll-capsule"><ArrowDown size={13} /></span> Scroll to explore</Link>
      <div className="story-pagination">
        {stories.map((item, index) => <button key={item.title} aria-label={`Show story ${index + 1}`} aria-pressed={index === current} onClick={() => setCurrent(index)}><span className={index === current ? "active" : ""} /></button>)}
        <button className="story-pause" onClick={() => setPaused(!paused)} aria-label={paused ? "Play stories" : "Pause stories"}>{paused ? <Play size={12} /> : <Pause size={12} />}</button>
      </div>
    </section>
  );
}
