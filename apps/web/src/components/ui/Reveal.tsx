"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

export interface RevealProps {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly className?: string;
}

/** Fade-and-rise reveal on scroll into view. Reusable across pages. */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
