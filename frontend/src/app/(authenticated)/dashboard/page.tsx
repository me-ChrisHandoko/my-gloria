import { UserInfoCard } from "@/components/dashboard/UserInfoCard";
import { ChartLineDefault } from "@/components/dashboard/ChartLineDefault";
import { ChartBarLabelCustom } from "@/components/dashboard/ChartBarLabelCustom";
import { ChartRadialShape } from "@/components/dashboard/ChartRadialShape";
import { ChartBarInteractive } from "@/components/dashboard/ChartBarInteractive";

export default function DashboardPage() {
  return (
    <div className="container mx-auto flex flex-col gap-4 p-4">
      {/* User Info Card - Full Width */}
      <UserInfoCard />
      
      {/* Charts Grid */}
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <ChartLineDefault />
        <ChartBarLabelCustom />
        <ChartRadialShape />
      </div>
      <ChartBarInteractive />
    </div>
  );
}