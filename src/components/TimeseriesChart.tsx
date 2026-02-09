import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { generateTimeseries } from "@/data/mockData";
import { useMemo } from "react";

interface Props {
  entityId?: string;
  variable?: string;
}

export function TimeseriesChart({ entityId = "st-1" }: Props) {
  const data = useMemo(() => {
    const seed = entityId.charCodeAt(entityId.length - 1) || 0;
    const obs = generateTimeseries(30, 45, 15, seed);
    const sim = generateTimeseries(30, 48, 18, seed + 5);
    return obs.map((o, i) => ({
      date: new Date(o.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      Observé: o.value,
      Simulé: sim[i]?.value ?? 0,
    }));
  }, [entityId]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(214, 20%, 90%)",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="Observé" stroke="hsl(210, 70%, 35%)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Simulé" stroke="hsl(185, 60%, 40%)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
