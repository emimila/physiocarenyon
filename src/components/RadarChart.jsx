import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

export default function RadarChart({ title, data, lines = [] }) {
  if (!data || data.length === 0) return null;

  return (
    <div
      style={{
        width: "100%",
        minWidth: 320,
        minHeight: 380,
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 14,
        background: "#fff",
      }}
    >
      {title && <h3 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h3>}

      <div style={{ width: "100%", height: 310 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="axis" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={6} />
            <Tooltip formatter={(value) => `${value}%`} />

            {lines.map((line) => (
              <Radar
                key={line.dataKey}
                name={line.name}
                dataKey={line.dataKey}
                stroke={line.stroke}
                fill={line.fill}
                fillOpacity={0.18}
              />
            ))}

            <Legend />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}