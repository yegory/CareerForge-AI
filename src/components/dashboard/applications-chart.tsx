"use client";

import { useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartPoint {
  label: string;
  sent: number;
  replies: number;
  score: number;
}

function subscribeToClientSnapshot() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ApplicationsChart({ data }: { data: ChartPoint[] }) {
  const mounted = useSyncExternalStore(
    subscribeToClientSnapshot,
    getClientSnapshot,
    getServerSnapshot,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
      <div className="h-64 rounded-lg border border-[#d9d4c8] bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#526163]">Applications</p>
            <h2 className="text-lg font-semibold text-[#152023]">Weekly flow</h2>
          </div>
          <span className="rounded-md bg-[#e6f2ef] px-2.5 py-1 text-sm font-medium text-[#17604f]">
            +18%
          </span>
        </div>
        <div className="h-[78%] min-h-0">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ left: -18, right: 8, top: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="sent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1f7668" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#1f7668" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ebe5d9" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#526163", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#526163", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ stroke: "#c7bfb0" }}
                  contentStyle={{
                    borderColor: "#d9d4c8",
                    borderRadius: 8,
                    boxShadow: "0 12px 34px rgba(21, 32, 35, 0.12)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="#1f7668"
                  strokeWidth={2}
                  fill="url(#sent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-md bg-[#f4efe4]" />
          )}
        </div>
      </div>

      <div className="h-64 rounded-lg border border-[#d9d4c8] bg-white p-4">
        <div className="mb-4">
          <p className="text-sm font-medium text-[#526163]">ATS scores</p>
          <h2 className="text-lg font-semibold text-[#152023]">Generated set</h2>
        </div>
        <div className="h-[78%] min-h-0">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ left: -18, right: 4, top: 8, bottom: 0 }}
              >
                <CartesianGrid stroke="#ebe5d9" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#526163", fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#526163", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "#f4efe4" }}
                  contentStyle={{
                    borderColor: "#d9d4c8",
                    borderRadius: 8,
                    boxShadow: "0 12px 34px rgba(21, 32, 35, 0.12)",
                  }}
                />
                <Bar dataKey="score" fill="#d97043" radius={[6, 6, 2, 2]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-md bg-[#f4efe4]" />
          )}
        </div>
      </div>
    </div>
  );
}
