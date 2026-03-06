"use client";

import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Sample data for charts
const productivityData = [
  { name: "Mon", tasks: 24, hours: 8 },
  { name: "Tue", tasks: 32, hours: 7.5 },
  { name: "Wed", tasks: 28, hours: 8.5 },
  { name: "Thu", tasks: 40, hours: 9 },
  { name: "Fri", tasks: 35, hours: 7 },
  { name: "Sat", tasks: 12, hours: 4 },
  { name: "Sun", tasks: 8, hours: 2 },
];

const weeklyTrendData = [
  { week: "Week 1", completed: 45, created: 52 },
  { week: "Week 2", completed: 58, created: 45 },
  { week: "Week 3", completed: 62, created: 68 },
  { week: "Week 4", completed: 71, created: 63 },
];

const projectDistributionData = [
  { name: "Development", value: 35, color: "#3B82F6" },
  { name: "Design", value: 25, color: "#8B5CF6" },
  { name: "Marketing", value: 20, color: "#F59E0B" },
  { name: "Research", value: 15, color: "#10B981" },
  { name: "Other", value: 5, color: "#6B7280" },
];

const burndownData = [
  { day: "Day 1", ideal: 100, actual: 100 },
  { day: "Day 2", ideal: 90, actual: 95 },
  { day: "Day 3", ideal: 80, actual: 88 },
  { day: "Day 4", ideal: 70, actual: 75 },
  { day: "Day 5", ideal: 60, actual: 70 },
  { day: "Day 6", ideal: 50, actual: 58 },
  { day: "Day 7", ideal: 40, actual: 45 },
  { day: "Day 8", ideal: 30, actual: 38 },
  { day: "Day 9", ideal: 20, actual: 25 },
  { day: "Day 10", ideal: 10, actual: 15 },
];

const teamPerformanceData = [
  { name: "John", tasks: 45, hours: 38 },
  { name: "Alice", tasks: 52, hours: 42 },
  { name: "Mike", tasks: 38, hours: 35 },
  { name: "Sarah", tasks: 48, hours: 40 },
  { name: "David", tasks: 35, hours: 32 },
];

export function ProductivityChart() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Weekly Productivity</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tasks">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
          </TabsList>
          <TabsContent value="tasks">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="hours">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function SprintBurndownChart() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Sprint Burndown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={burndownData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="day" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="ideal"
              stroke="#94A3B8"
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ProjectDistributionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Project Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={projectDistributionData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {projectDistributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {projectDistributionData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">{item.name}</span>
              <span className="text-xs font-medium">{item.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamPerformanceChart() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Team Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={teamPerformanceData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" className="text-xs" />
            <YAxis dataKey="name" type="category" className="text-xs" width={60} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar dataKey="tasks" fill="#3B82F6" name="Tasks" radius={[0, 4, 4, 0]} />
            <Bar dataKey="hours" fill="#10B981" name="Hours" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function WeeklyTrendChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Weekly Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={weeklyTrendData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="week" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stackId="1"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="created"
              stackId="2"
              stroke="#F59E0B"
              fill="#F59E0B"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
