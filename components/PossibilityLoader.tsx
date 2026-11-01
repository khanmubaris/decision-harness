"use client";

import { useId, type CSSProperties } from "react";

const messages = [
  "Every decision begins somewhere.",
  "Exploring the paths ahead...",
  "Considering what matters to you...",
  "Mapping possible consequences...",
  "Finding the trade-offs...",
  "Your crossroads are taking shape...",
];
const branches = [
  { d: "M100 170 C155 170 185 170 245 170", delay: 0, tone: "mint" },
  { d: "M245 170 C325 170 325 82 420 82", delay: 1, tone: "mint" },
  { d: "M245 170 C325 170 325 258 420 258", delay: 1, tone: "violet" },
  { d: "M420 82 C480 82 480 40 550 40", delay: 2.8, tone: "mint" },
  { d: "M420 82 C480 82 480 120 550 120", delay: 3.2, tone: "mint" },
  { d: "M420 258 C480 258 480 220 550 220", delay: 3.2, tone: "violet" },
  { d: "M420 258 C480 258 480 300 550 300", delay: 2.8, tone: "violet" },
];
const nodes = [
  { x: 245, y: 170, delay: 1.3, tone: "mint", small: true },
  { x: 420, y: 82, delay: 2.8, tone: "mint" },
  { x: 420, y: 258, delay: 2.8, tone: "violet" },
  { x: 550, y: 40, delay: 4.4, tone: "mint", small: true },
  { x: 550, y: 120, delay: 4.8, tone: "mint", small: true },
  { x: 550, y: 220, delay: 4.8, tone: "violet", small: true },
  { x: 550, y: 300, delay: 4.4, tone: "violet", small: true },
];

export default function PossibilityLoader({ question }: { question: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="possibility-loader">
      <div className="eyebrow">THE PATHS OF POSSIBILITY</div>
      <h2 id="context-title">{question}</h2>
      <div className="possibility-art" aria-hidden="true">
        <svg viewBox="0 0 650 340" fill="none">
          <defs>
            <radialGradient id={`${id}-atmosphere`}>
              <stop stopColor="#c4f1d7" stopOpacity=".08" />
              <stop offset="1" stopColor="#c4f1d7" stopOpacity="0" />
            </radialGradient>
            <filter
              id={`${id}-glow`}
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur stdDeviation="3" />
            </filter>
            {(["mint", "violet"] as const).map((tone) => (
              <linearGradient
                key={tone}
                id={`${id}-${tone}`}
                x1="100"
                y1="170"
                x2="550"
                y2="170"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#c4f1d7" stopOpacity=".65" />
                <stop
                  offset="1"
                  stopColor={tone === "mint" ? "#c4f1d7" : "#c6b7e6"}
                />
              </linearGradient>
            ))}
          </defs>
          <ellipse
            cx="320"
            cy="170"
            rx="300"
            ry="170"
            fill={`url(#${id}-atmosphere)`}
          />
          {branches.map(({ d, delay, tone }, i) => (
            <g key={d} style={{ "--path-delay": `${delay}s` } as CSSProperties}>
              <path
                d={d}
                stroke={tone === "mint" ? "#c4f1d7" : "#c6b7e6"}
                strokeOpacity=".08"
              />
              <path
                className="possibility-line possibility-glow"
                d={d}
                pathLength="1"
                stroke={`url(#${id}-${tone})`}
                strokeWidth="4"
                filter={`url(#${id}-glow)`}
              />
              <path
                className="possibility-line"
                d={d}
                pathLength="1"
                stroke={`url(#${id}-${tone})`}
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              {i < 3 && (
                <path
                  className="possibility-pulse"
                  d={d}
                  pathLength="1"
                  stroke={tone === "mint" ? "#e5ffef" : "#ece3ff"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}
            </g>
          ))}
          {nodes.map(({ x, y, delay, tone, small }) => (
            <g
              key={`${x}-${y}`}
              className="possibility-node"
              style={
                {
                  "--path-delay": `${delay}s`,
                  transformOrigin: `${x}px ${y}px`,
                } as CSSProperties
              }
            >
              <circle
                cx={x}
                cy={y}
                r={small ? 7 : 15}
                fill={tone === "mint" ? "#c4f1d7" : "#c6b7e6"}
                opacity=".14"
                filter={`url(#${id}-glow)`}
              />
              <circle
                cx={x}
                cy={y}
                r={small ? 3 : 6}
                fill="#191f1c"
                stroke={tone === "mint" ? "#c4f1d7" : "#c6b7e6"}
              />
              {!small && (
                <circle
                  cx={x}
                  cy={y}
                  r="2"
                  fill={tone === "mint" ? "#c4f1d7" : "#c6b7e6"}
                />
              )}
            </g>
          ))}
          <circle
            className="possibility-origin-halo"
            cx="100"
            cy="170"
            r="23"
            stroke="#c4f1d7"
            strokeOpacity=".18"
          />
          <circle
            cx="100"
            cy="170"
            r="12"
            fill="#c4f1d7"
            opacity=".25"
            filter={`url(#${id}-glow)`}
          />
          <circle cx="100" cy="170" r="5" fill="#e4ffef" />
          <text
            x="100"
            y="211"
            fill="#929c99"
            fontSize="10"
            textAnchor="middle"
            letterSpacing="2"
          >
            YOU, HERE
          </text>
        </svg>
      </div>
      <div className="possibility-messages" aria-hidden="true">
        {messages.map((message, i) => (
          <p
            key={message}
            style={{ "--message-delay": `${i * 6}s` } as CSSProperties}
          >
            {message}
          </p>
        ))}
      </div>
      <p className="possibility-caption">
        One decision. More than one way forward.
      </p>
      <span className="sr-only" role="status">
        Exploring your possible futures. Your paths will appear as soon as they
        are ready.
      </span>
    </div>
  );
}
