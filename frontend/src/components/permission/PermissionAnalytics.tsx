'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Shield, Users, Activity, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

// Mock data for analytics
const mockPermissionUsage = [
  { resource: 'user', count: 450, percentage: 35 },
  { resource: 'role', count: 280, percentage: 22 },
  { resource: 'report', count: 220, percentage: 17 },
  { resource: 'document', count: 180, percentage: 14 },
  { resource: 'settings', count: 150, percentage: 12 },
];

const mockActionDistribution = [
  { name: 'READ', value: 45, color: '#3b82f6' },
  { name: 'UPDATE', value: 25, color: '#10b981' },
  { name: 'CREATE', value: 15, color: '#8b5cf6' },
  { name: 'DELETE', value: 8, color: '#ef4444' },
  { name: 'APPROVE', value: 7, color: '#f59e0b' },
];

const mockPermissionTrends = [
  { date: 'Mon', granted: 120, revoked: 20 },
  { date: 'Tue', granted: 145, revoked: 30 },
  { date: 'Wed', granted: 130, revoked: 25 },
  { date: 'Thu', granted: 160, revoked: 35 },
  { date: 'Fri', granted: 140, revoked: 28 },
  { date: 'Sat', granted: 85, revoked: 15 },
  { date: 'Sun', granted: 70, revoked: 10 },
];

const mockDeniedAccess = [
  { user: 'John Doe', resource: 'financial.reports', action: 'DELETE', time: '2 hours ago' },
  { user: 'Jane Smith', resource: 'user.profile', action: 'UPDATE', time: '4 hours ago' },
  { user: 'Bob Johnson', resource: 'admin.settings', action: 'CREATE', time: '6 hours ago' },
  { user: 'Alice Brown', resource: 'document.archive', action: 'DELETE', time: '1 day ago' },
];

const mockStats = {
  totalPermissions: 156,
  activeRoles: 24,
  usersWithPermissions: 1248,
  avgPermissionsPerUser: 8.5,
  deniedAccessLast24h: 47,
  permissionChangesLast7d: 312,
};

export function PermissionAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalPermissions}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.activeRoles}</div>
            <p className="text-xs text-muted-foreground">
              +2 new roles this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Permissions/User</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.avgPermissionsPerUser}</div>
            <p className="text-xs text-muted-foreground">
              Across {mockStats.usersWithPermissions} users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denied Access (24h)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.deniedAccessLast24h}</div>
            <p className="text-xs text-muted-foreground">
              -15% from yesterday
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <TabsList>
          <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Permission Usage by Resource */}
            <Card>
              <CardHeader>
                <CardTitle>Permission Usage by Resource</CardTitle>
                <CardDescription>
                  Most frequently accessed resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPermissionUsage.map((item) => (
                    <div key={item.resource} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.resource}</span>
                        <span className="text-muted-foreground">{item.count} requests</span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Action Distribution</CardTitle>
                <CardDescription>
                  Breakdown of permission actions
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockActionDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockActionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Permission Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Permission Changes Over Time</CardTitle>
              <CardDescription>
                Granted vs Revoked permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockPermissionTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="granted"
                    stroke="#10b981"
                    name="Granted"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="revoked"
                    stroke="#ef4444"
                    name="Revoked"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Denied Access */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Denied Access Attempts</CardTitle>
              <CardDescription>
                Users who were denied access to resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockDeniedAccess.map((item, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{item.user}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.resource}</span>
                        <Badge variant="destructive" className="text-xs">
                          {item.action}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {item.time}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}