/* ------------------------------------------------------------------
   src/components/Projects.tsx
   The Projects section is now a staged 3D illustration: a raccoon film crew
   runs a projector on the left, two hand-modelled raccoons hold up the screen
   on the right, and the active project's architecture diagram is projected
   onto that screen.

   The old left-hand app-icon grid is gone. Project switching lives in a
   compact row under the canvas so the scene gets the full section width.
-------------------------------------------------------------------*/
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { projects, Project } from "@/lib/projects";
import { Github } from "lucide-react";
import ProjectorRaccoonScene from "@/components/ProjectorRaccoonScene";

/** /projects/saas.png -> /projects/saas_arch.png */
const archSrcFor = (p: Project) => p.logo.replace(/(\.[^.]+)$/, "_arch$1");

export default function ProjectsSection() {
  const [active, setActive] = useState<Project>(projects[0]);
  const archSrc = useMemo(() => archSrcFor(active), [active]);

  return (
    <section id="projects" className="relative z-20 pt-10 pb-24 sm:pt-14 sm:pb-32 sm:mb-12">
      <h2 className="text-4xl font-bold neon-text text-center mb-6">
        Projects
      </h2>

      <div className="max-w-7xl mx-auto px-4">
        {/* THE SHOW ------------------------------------------------------ */}
        <ProjectorRaccoonScene archSrc={archSrc} />

        {/* PROJECT SWITCHER ---------------------------------------------- */}
        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:gap-3 relative z-30">
          {projects.map((p) => {
            const isActive = active.name === p.name;
            return (
              <button
                key={p.name}
                onClick={() => setActive(p)}
                title={p.name}
                aria-label={p.name}
                aria-pressed={isActive}
                className={`rounded-lg bg-gradient-to-br ${p.gradient}
                  w-9 h-9 sm:w-11 sm:h-11
                  flex items-center justify-center
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white
                  transform transition-all duration-150
                  ${isActive
                    ? "scale-110 ring-2 ring-white shadow-lg"
                    : "opacity-70 hover:opacity-100 hover:scale-105"
                  }`}
              >
                <Image
                  src={p.logo}
                  alt=""
                  width={42}
                  height={42}
                  className="w-6 h-6 sm:w-7 sm:h-7 filter brightness-0 invert"
                />
              </button>
            );
          })}
        </div>

        {/* DETAILS -------------------------------------------------------- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1], type: "tween" }}
            className="mt-8 max-w-3xl mx-auto space-y-4 text-center"
          >
            <motion.h3
              className="text-xl font-semibold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {active.name}
            </motion.h3>

            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              {active.description}
            </motion.p>

            <motion.div
              className="flex flex-wrap justify-center gap-2 z-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {active.tech.map((tech, idx) => (
                <motion.span
                  key={tech}
                  className="text-xs px-2 py-1 rounded bg-[var(--border)]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.25 + idx * 0.04,
                    duration: 0.2,
                    type: "spring",
                    stiffness: 200,
                  }}
                >
                  {tech}
                </motion.span>
              ))}
            </motion.div>

            <motion.a
              href={active.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-4 text-sm neon-text underline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <Github size={16} className="inline-block" aria-hidden="true" />
              <span>View on GitHub</span>
            </motion.a>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
