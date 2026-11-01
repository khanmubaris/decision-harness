"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  BaseEdge,
  getBezierPath,
  type EdgeProps,
  Controls,
  Handle,
  Position,
  useReactFlow,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import { ArrowUpRight, GitBranch, Flag } from "lucide-react";
import "@xyflow/react/dist/style.css";
import { type Scenario, pathTo } from "@/lib/decision/schema";
type CardData = {
  title: string;
  summary: string;
  depth: number;
  horizon: string;
  active: boolean;
  violet: boolean;
  root: boolean;
  branch: number;
  mobile: boolean;
  insight: string;
  assessment: "fresh" | "updated" | "stale";
};
function Card({ data }: NodeProps<Node<CardData>>) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Explore ${data.title}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      className={`map-card ${data.active ? "active" : ""} ${data.violet ? "violet" : ""} ${data.root ? "root-card" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      {data.root ? (
        <div className="present-orbit" aria-hidden="true">
          <span />
          <GitBranch size={26} />
        </div>
      ) : (
        <svg
          className="node-landscape"
          viewBox="0 0 320 130"
          fill="none"
          aria-hidden="true"
        >
          <path d="M110 140 C160 90 190 110 230 40 S300 0 340 -20" />
          <path d="M140 150 C180 100 215 120 255 50 S325 15 350 -10" />
          <path d="M170 160 C210 110 245 130 280 60 S350 30 380 0" />
          <circle cx="239" cy="28" r="4" />
        </svg>
      )}
      <div className="node-eyebrow">
        {data.root ? (
          <GitBranch size={13} />
        ) : data.depth === 5 ? (
          <Flag size={13} />
        ) : (
          <span className="node-dot" />
        )}
        {data.root
          ? "YOU ARE HERE"
          : `PATH ${String(data.branch).padStart(2, "0")} / STEP ${data.depth}`}
        {data.assessment !== "fresh" && (
          <span className={`node-state ${data.assessment}`}>
            {data.assessment === "updated" ? "Updated" : "Review"}
          </span>
        )}
      </div>
      <h3>
        <span className="node-title" title={data.title}>
          {data.title}
        </span>
        {!data.root && (
          <span className="node-open">
            <ArrowUpRight size={18} />
          </span>
        )}
      </h3>
      <p>{data.summary}</p>
      {!data.root && (
        <div className="node-horizon">
          <span />
          {data.horizon}
        </div>
      )}
      {!data.root && (
        <div className="node-insight">
          <span>POSSIBLE UPSIDE</span>
          <p>{data.insight}</p>
        </div>
      )}
      <div className="node-footer">
        {data.root
          ? "Two choices. Many possibilities."
          : data.depth === 5
            ? "A possible future"
            : "Explore this possibility"}
        <span>→</span>
      </div>
      <Handle
        type="source"
        position={data.mobile ? Position.Left : Position.Right}
      />
    </div>
  );
}
function PossibilityEdge(props: EdgeProps) {
  const [bezier] = getBezierPath({ ...props, curvature: 0.45 });
  const path = props.data?.mobile
    ? `M ${props.sourceX} ${props.sourceY} C ${props.sourceX - 65} ${props.sourceY}, ${props.targetX - 65} ${props.targetY}, ${props.targetX} ${props.targetY}`
    : bezier;
  const tone = props.data?.violet ? "violet" : "mint";
  return (
    <g
      className={`future-edge ${tone} ${props.data?.active ? "is-explored" : ""}`}
    >
      <path className="future-edge-halo" d={path} fill="none" />
      <BaseEdge id={props.id} path={path} className="future-edge-line" />
      <path className="future-edge-pulse" d={path} pathLength="1" fill="none" />
    </g>
  );
}
const nodeTypes = { card: Card };
const edgeTypes = { possibility: PossibilityEdge };
function FlowCanvas({
  scenario,
  selected,
  onSelect,
  collapsed,
  detailsOpen,
}: {
  scenario: Scenario;
  selected: string;
  onSelect: (id: string) => void;
  collapsed: string[];
  detailsOpen: boolean;
}) {
  const flow = useReactFlow();
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const { nodes, edges } = useMemo(() => {
    const active = new Set(pathTo(scenario.nodes, selected).map((n) => n.id));
    const visible = scenario.nodes.filter(
      (n) =>
        !pathTo(scenario.nodes, n.id)
          .slice(0, -1)
          .some((a) => collapsed.includes(a.id)),
    );
    const positions = new Map<string, number>();
    let leaf = 0;
    function place(id: string): number {
      const children = visible.filter((n) => n.parentId === id);
      const y = children.length
        ? children.map((n) => place(n.id)).reduce((a, b) => a + b, 0) /
          children.length
        : leaf++ * 395;
      positions.set(id, y);
      return y;
    }
    place("root");
    const nodes: Node<CardData>[] = [
      {
        id: "root",
        type: "card",
        position: {
          x: mobile ? 20 : 0,
          y: mobile ? 0 : positions.get("root") || 0,
        },
        data: {
          title:
            scenario.category === "Career"
              ? "Your next career chapter"
              : scenario.question.slice(0, 70),
          summary: scenario.tradeoff,
          depth: 0,
          horizon: "",
          active: selected === "root",
          violet: false,
          root: true,
          insight: "",
          assessment: "fresh",
          branch: 0,
          mobile,
        },
      },
      ...visible.map((n, index) => ({
        id: n.id,
        type: "card",
        position: mobile
          ? { x: 0, y: 290 + index * 375 }
          : { x: n.depth * 490, y: positions.get(n.id) || 0 },
        data: {
          title: n.title,
          summary: n.summary,
          depth: n.depth,
          horizon: n.horizon,
          active: active.has(n.id),
          violet:
            scenario.nodes
              .filter((x) => x.parentId === "root")
              .findIndex(
                (x) => x.id === pathTo(scenario.nodes, n.id)[0]?.id,
              ) === 1,
          branch:
            scenario.nodes
              .filter((x) => x.parentId === n.parentId)
              .findIndex((x) => x.id === n.id) + 1,
          insight: n.benefits[0],
          assessment: scenario.staleNodeIds?.includes(n.id)
            ? ("stale" as const)
            : scenario.lastChange?.nodes.some((node) => node.id === n.id)
              ? ("updated" as const)
              : ("fresh" as const),
          root: false,
          mobile,
        },
      })),
    ];
    return {
      nodes,
      edges: visible.map((n) => ({
        id: `e-${n.id}`,
        source: n.parentId,
        target: n.id,
        type: "possibility",
        data: {
          mobile,
          active: active.has(n.id),
          violet:
            scenario.nodes
              .filter((x) => x.parentId === "root")
              .findIndex(
                (x) => x.id === pathTo(scenario.nodes, n.id)[0]?.id,
              ) === 1,
        },
      })),
    };
  }, [scenario, selected, collapsed, mobile]);
  useEffect(() => {
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 450;
    const timer = setTimeout(() => {
      const target = nodes.find((n) => n.id === selected);
      if (nodes.length <= (mobile ? 3 : 5))
        flow.fitView({ padding: 0.18, duration, maxZoom: 1 });
      else if (target)
        flow.setCenter(target.position.x + 160, target.position.y + 140, {
          zoom: 0.85,
          duration,
        });
    }, 100);
    return () => clearTimeout(timer);
  }, [nodes.length, selected, flow, collapsed.length, detailsOpen, mobile]);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={(_, n) => onSelect(n.id)}
      fitView
      minZoom={0.2}
      maxZoom={1.5}
      nodesDraggable={false}
      nodesFocusable={false}
      nodesConnectable={false}
      colorMode="dark"
      proOptions={{ hideAttribution: true }}
    >
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
export default function DecisionGraph(props: Parameters<typeof FlowCanvas>[0]) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
