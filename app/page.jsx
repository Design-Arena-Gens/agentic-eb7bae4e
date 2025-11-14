"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "./styles.module.css";

const Battery3D = dynamic(() => import("./components/Battery3D"), { ssr: false });

export default function Page() {
  const [charge, setCharge] = useState(0.65);
  const [animate, setAnimate] = useState(true);

  // Smooth demo animation when enabled
  useEffect(() => {
    if (!animate) return;
    let direction = -1;
    let raf;
    const tick = () => {
      setCharge((prev) => {
        let next = prev + direction * 0.0045;
        if (next <= 0.05) {
          next = 0.05;
          direction = 1;
        } else if (next >= 1) {
          next = 1;
          direction = -1;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  const percent = useMemo(() => Math.round(charge * 100), [charge]);

  return (
    <main className={styles.container}>
      <section className={styles.panel}>
        <h1 className={styles.title}>3D Battery</h1>
        <p className={styles.subtitle}>Interactive react-three-fiber component</p>
        <div className={styles.controls}>
          <label className={styles.row}>
            <span>Charge: {percent}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={charge}
              onChange={(e) => setCharge(parseFloat(e.target.value))}
            />
          </label>
          <label className={styles.row}>
            <input
              type="checkbox"
              checked={animate}
              onChange={(e) => setAnimate(e.target.checked)}
            />
            <span>Animate</span>
          </label>
        </div>
      </section>
      <section className={styles.canvasWrap}>
        <Battery3D charge={charge} />
      </section>
      <footer className={styles.footer}>
        <span className={styles.legend}>
          <span className={styles.dot} style={{ background: "#e11d48" }} /> Low
        </span>
        <span className={styles.legend}>
          <span className={styles.dot} style={{ background: "#f59e0b" }} /> Medium
        </span>
        <span className={styles.legend}>
          <span className={styles.dot} style={{ background: "#10b981" }} /> High
        </span>
      </footer>
    </main>
  );
}
