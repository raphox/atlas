import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Box,
  Code2,
  GitBranch,
  Layers3,
  Menu,
  X,
} from "lucide-react";
import Content from "./content/city-map.mdx";
import Features from "./content/features.mdx";
const LazyPlayground = lazy(() =>
  import("./playground.jsx").then((module) => ({ default: module.Playground })),
);
function Playground() {
  return (
    <Suspense
      fallback={
        <div className="playground-loading" role="status">
          Loading the playground…
        </div>
      }
    >
      <LazyPlayground />
    </Suspense>
  );
}

const sections = [
  ["overview", "Overview"],
  ["playground", "Playground"],
  ["installation", "Installation"],
  ["data", "Data format"],
  ["props", "Props"],
  ["events", "Events and controls"],
  ["themes", "Themes and styling"],
  ["deployment", "GitHub Pages"],
];
const featureSections = [
  ["features", "All features"],
  ["visualization", "3D visualization"],
  ["interaction", "Navigation and interaction"],
  ["weather", "Weather API"],
  ["lighting", "Lighting"],
  ["monitoring", "Monitoring and data"],
  ["integration", "Integration"],
];

export function Docs() {
  const isFeatures =
    new URLSearchParams(location.search).get("page") === "features";
  const navigation = isFeatures ? featureSections : sections;
  const firstSection = navigation[0][0];
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(location.hash.slice(1) || firstSection);
  useEffect(() => {
    document.title = isFeatures
      ? "Features · Atlas Docs"
      : "CityMap · Atlas Docs";
    const update = () => setActive(location.hash.slice(1) || firstSection);
    window.addEventListener("hashchange", update);
    // MDX is mounted after the browser's initial fragment navigation.
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
    return () => window.removeEventListener("hashchange", update);
  }, [isFeatures, firstSection]);
  return (
    <div className="docs">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="docs-header">
        <a className="brand" href="./" aria-label="Atlas Docs, home">
          <Layers3 size={27} strokeWidth={1.8} />
          <span>atlas</span>
          <span className="brand-divider" />
          <span className="brand-docs">docs</span>
        </a>
        <div className="header-links">
          <a
            className="header-page-link"
            href="./"
            aria-current={!isFeatures ? "page" : undefined}
          >
            Documentation
          </a>
          <a
            className="header-page-link"
            href="?page=features"
            aria-current={isFeatures ? "page" : undefined}
          >
            Features
          </a>
          <span className="version">v0.1.0</span>
          <a
            href="https://github.com/raphox/atlas"
            target="_blank"
            rel="noreferrer"
          >
            <GitBranch size={17} />
            <span>GitHub</span>
            <ArrowUpRight size={13} />
          </a>
          <button
            className="mobile-menu icon-button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="docs-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <aside className={`docs-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="sidebar-label">
          <BookOpen size={14} /> DOCUMENTATION
        </div>
        <nav id="docs-nav" aria-label="Documentation">
          {navigation.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? "location" : undefined}
              onClick={() => {
                setActive(id);
                setMenuOpen(false);
              }}
            >
              {label}
              {id === "playground" && <Code2 size={14} />}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <Box size={20} />
          <strong>Your data. Your city.</strong>
          <p>One React component. An entire city to explore.</p>
          <a href="./#installation">
            Start building <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="sidebar-footer">
          React + Three.js
          <br />
          Built with TanStack Charts
        </div>
      </aside>
      <main id="content" className="docs-main">
        <div className="breadcrumbs">
          {isFeatures ? "Project" : "Components"} <span>/</span>{" "}
          {isFeatures ? "Features and integrations" : "Data visualization"}{" "}
          <span>/</span> <strong>{isFeatures ? "Features" : "CityMap"}</strong>
        </div>
        {isFeatures ? <Features /> : <Content components={{ Playground }} />}
        <footer className="docs-footer">
          <span>Atlas · Project documentation</span>
          <a
            href={`https://github.com/raphox/atlas/blob/main/docs/content/${isFeatures ? "features" : "city-map"}.mdx`}
            target="_blank"
            rel="noreferrer"
          >
            Edit this page <ArrowUpRight size={14} />
          </a>
        </footer>
      </main>
    </div>
  );
}
