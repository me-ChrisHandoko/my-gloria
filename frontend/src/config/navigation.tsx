import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Shield,
  ClipboardList,
  BarChart3,
  Star,
  MessageSquare,
  GraduationCap,
  Settings,
  FileText,
  Bell,
  HelpCircle,
  LogOut,
  UserCircle,
  ChevronRight,
  Wrench,
  Building,
  Target,
  Activity,
  Award,
  CheckCircle,
  TrendingUp,
  BookOpen,
  Calendar,
  UserCheck,
  PieChart,
  FileBarChart,
  AlertCircle,
  Archive,
  FolderOpen,
  Database,
  Key,
  Lock,
  Users2,
  UserPlus,
  History,
  Download,
  Upload,
} from "lucide-react";
import { MenuSection, NavigationConfig } from "@/types/navigation";

export const navigationConfig: NavigationConfig = {
  sections: [
    // Main Navigation
    {
      id: "main",
      items: [
        {
          id: "dashboard",
          title: "Dashboard",
          titleIndonesian: "Dasbor",
          url: "/",
          icon: LayoutDashboard,
          shortcut: "⌘D",
        },
        {
          id: "notifications",
          title: "Notifications",
          titleIndonesian: "Notifikasi",
          url: "/notifications",
          icon: Bell,
          badge: {
            value: 5,
            variant: "destructive",
          },
        },
      ],
    },

    // Organization Management
    {
      id: "organization",
      title: "Organization",
      titleIndonesian: "Organisasi",
      collapsible: true,
      defaultExpanded: true,
      items: [
        {
          id: "org-structure",
          title: "Organization Structure",
          titleIndonesian: "Struktur Organisasi",
          url: "/organization",
          icon: Building2,
          children: [
            {
              id: "schools",
              title: "Schools",
              titleIndonesian: "Sekolah",
              url: "/organization/schools",
              icon: Building,
            },
            {
              id: "departments",
              title: "Departments",
              titleIndonesian: "Departemen",
              url: "/organization/departments",
              icon: Briefcase,
            },
            {
              id: "positions",
              title: "Positions",
              titleIndonesian: "Jabatan",
              url: "/organization/positions",
              icon: UserCheck,
            },
            {
              id: "hierarchy",
              title: "Hierarchy View",
              titleIndonesian: "Tampilan Hierarki",
              url: "/organization/hierarchy",
              icon: ChevronRight,
            },
          ],
        },
        {
          id: "employees",
          title: "Employees",
          titleIndonesian: "Karyawan",
          url: "/employees",
          icon: Users,
          children: [
            {
              id: "employee-list",
              title: "Employee List",
              titleIndonesian: "Daftar Karyawan",
              url: "/employees/list",
              icon: Users2,
            },
            {
              id: "user-positions",
              title: "Position Assignments",
              titleIndonesian: "Penugasan Jabatan",
              url: "/employees/positions",
              icon: UserPlus,
            },
          ],
        },
      ],
    },

    // Service Modules
    {
      id: "services",
      title: "Services",
      titleIndonesian: "Layanan",
      collapsible: true,
      defaultExpanded: false,
      items: [
        {
          id: "work-orders",
          title: "Work Orders",
          titleIndonesian: "Perintah Kerja",
          icon: Wrench,
          children: [
            {
              id: "wo-it",
              title: "IT Service Desk",
              titleIndonesian: "Layanan IT",
              url: "/work-orders/it",
              icon: Database,
              badge: {
                value: 3,
                variant: "secondary",
              },
            },
            {
              id: "wo-ga",
              title: "General Affairs",
              titleIndonesian: "Umum",
              url: "/work-orders/ga",
              icon: Building,
              badge: {
                value: 7,
                variant: "secondary",
              },
            },
            {
              id: "wo-my-requests",
              title: "My Requests",
              titleIndonesian: "Permintaan Saya",
              url: "/work-orders/my-requests",
              icon: ClipboardList,
            },
            {
              id: "wo-approvals",
              title: "Pending Approvals",
              titleIndonesian: "Persetujuan Tertunda",
              url: "/work-orders/approvals",
              icon: CheckCircle,
              badge: {
                value: 2,
                variant: "destructive",
              },
            },
          ],
        },
      ],
    },

    // Performance Management
    {
      id: "performance",
      title: "Performance",
      titleIndonesian: "Kinerja",
      collapsible: true,
      defaultExpanded: false,
      items: [
        {
          id: "kpi",
          title: "KPI Management",
          titleIndonesian: "Manajemen KPI",
          icon: BarChart3,
          children: [
            {
              id: "kpi-dashboard",
              title: "KPI Dashboard",
              titleIndonesian: "Dasbor KPI",
              url: "/kpi/dashboard",
              icon: PieChart,
            },
            {
              id: "kpi-targets",
              title: "Set Targets",
              titleIndonesian: "Tetapkan Target",
              url: "/kpi/targets",
              icon: Target,
            },
            {
              id: "kpi-tracking",
              title: "Progress Tracking",
              titleIndonesian: "Pelacakan Kemajuan",
              url: "/kpi/tracking",
              icon: TrendingUp,
            },
            {
              id: "kpi-reports",
              title: "Reports",
              titleIndonesian: "Laporan",
              url: "/kpi/reports",
              icon: FileBarChart,
            },
          ],
        },
        {
          id: "evaluations",
          title: "Evaluations",
          titleIndonesian: "Evaluasi",
          icon: Star,
          children: [
            {
              id: "peer-evaluation",
              title: "Peer Evaluation",
              titleIndonesian: "Evaluasi Rekan",
              url: "/evaluations/peer",
              icon: Users2,
            },
            {
              id: "activity-evaluation",
              title: "Activity Evaluation",
              titleIndonesian: "Evaluasi Kegiatan",
              url: "/evaluations/activity",
              icon: Activity,
            },
            {
              id: "self-assessment",
              title: "Self Assessment",
              titleIndonesian: "Penilaian Diri",
              url: "/evaluations/self",
              icon: UserCircle,
            },
          ],
        },
      ],
    },

    // Quality Management
    {
      id: "quality",
      title: "Quality",
      titleIndonesian: "Kualitas",
      collapsible: true,
      defaultExpanded: false,
      items: [
        {
          id: "ics",
          title: "Internal Control System",
          titleIndonesian: "Sistem Pengendalian Internal",
          url: "/quality/ics",
          icon: Shield,
        },
        {
          id: "quality-objectives",
          title: "Quality Objectives",
          titleIndonesian: "Sasaran Mutu",
          url: "/quality/objectives",
          icon: Award,
        },
        {
          id: "measurement-tools",
          title: "Measurement Tools",
          titleIndonesian: "Alat Ukur",
          url: "/quality/measurement",
          icon: Activity,
        },
      ],
    },

    // Feedback & Survey
    {
      id: "feedback",
      title: "Feedback",
      titleIndonesian: "Umpan Balik",
      collapsible: true,
      defaultExpanded: false,
      items: [
        {
          id: "staff-survey",
          title: "Staff Survey",
          titleIndonesian: "Angket Staf",
          url: "/feedback/survey",
          icon: MessageSquare,
        },
        {
          id: "survey-results",
          title: "Survey Results",
          titleIndonesian: "Hasil Survei",
          url: "/feedback/results",
          icon: BarChart3,
        },
      ],
    },

    // Training Management
    {
      id: "training",
      title: "Training",
      titleIndonesian: "Pelatihan",
      collapsible: true,
      defaultExpanded: false,
      items: [
        {
          id: "training-calendar",
          title: "Training Calendar",
          titleIndonesian: "Kalender Pelatihan",
          url: "/training/calendar",
          icon: Calendar,
        },
        {
          id: "training-catalog",
          title: "Course Catalog",
          titleIndonesian: "Katalog Kursus",
          url: "/training/catalog",
          icon: BookOpen,
        },
        {
          id: "my-trainings",
          title: "My Trainings",
          titleIndonesian: "Pelatihan Saya",
          url: "/training/my-trainings",
          icon: GraduationCap,
        },
        {
          id: "training-history",
          title: "Training History",
          titleIndonesian: "Riwayat Pelatihan",
          url: "/training/history",
          icon: History,
        },
      ],
    },

    // Reports & Analytics
    {
      id: "reports",
      title: "Reports",
      titleIndonesian: "Laporan",
      collapsible: true,
      defaultExpanded: false,
      items: [
        {
          id: "operational-reports",
          title: "Operational Reports",
          titleIndonesian: "Laporan Operasional",
          url: "/reports/operational",
          icon: FileText,
        },
        {
          id: "analytics-dashboard",
          title: "Analytics Dashboard",
          titleIndonesian: "Dasbor Analitik",
          url: "/reports/analytics",
          icon: PieChart,
        },
        {
          id: "export-data",
          title: "Export Data",
          titleIndonesian: "Ekspor Data",
          url: "/reports/export",
          icon: Download,
        },
        {
          id: "import-data",
          title: "Import Data",
          titleIndonesian: "Impor Data",
          url: "/reports/import",
          icon: Upload,
        },
      ],
    },

    // System Administration
    {
      id: "system",
      title: "System",
      titleIndonesian: "Sistem",
      collapsible: true,
      defaultExpanded: false,
      requiredRoles: ["ADMIN", "SUPER_ADMIN"],
      items: [
        {
          id: "permissions",
          title: "Permissions",
          titleIndonesian: "Izin",
          url: "/permissions",
          icon: Key,
          requiredPermissions: ["permission.read"],
        },
        {
          id: "roles",
          title: "Roles & Access",
          titleIndonesian: "Peran & Akses",
          url: "/roles",
          icon: Lock,
          requiredPermissions: ["role.read"],
        },
        {
          id: "audit-logs",
          title: "Audit Logs",
          titleIndonesian: "Log Audit",
          url: "/audit",
          icon: History,
          requiredPermissions: ["audit.read"],
        },
        {
          id: "system-settings",
          title: "System Settings",
          titleIndonesian: "Pengaturan Sistem",
          url: "/settings/system",
          icon: Settings,
          requiredPermissions: ["system.manage"],
        },
        {
          id: "approval-matrix",
          title: "Approval Matrix",
          titleIndonesian: "Matriks Persetujuan",
          url: "/settings/approval-matrix",
          icon: CheckCircle,
          requiredPermissions: ["approval.manage"],
        },
        {
          id: "backup",
          title: "Backup & Restore",
          titleIndonesian: "Cadangan & Pemulihan",
          url: "/settings/backup",
          icon: Archive,
          requiredPermissions: ["system.backup"],
        },
      ],
    },
  ],

  // Footer Items
  footerItems: [
    {
      id: "help",
      title: "Help & Support",
      titleIndonesian: "Bantuan & Dukungan",
      url: "/help",
      icon: HelpCircle,
    },
    {
      id: "user-settings",
      title: "User Settings",
      titleIndonesian: "Pengaturan Pengguna",
      url: "/settings/profile",
      icon: Settings,
    },
  ],

  // User Menu Items (dropdown)
  userMenuItems: [
    {
      id: "profile",
      title: "My Profile",
      titleIndonesian: "Profil Saya",
      url: "/profile",
      icon: UserCircle,
    },
    {
      id: "preferences",
      title: "Preferences",
      titleIndonesian: "Preferensi",
      url: "/settings/preferences",
      icon: Settings,
    },
    {
      id: "separator-1",
      separator: true,
    },
    {
      id: "help",
      title: "Help Center",
      titleIndonesian: "Pusat Bantuan",
      url: "/help",
      icon: HelpCircle,
    },
    {
      id: "separator-2",
      separator: true,
    },
    {
      id: "logout",
      title: "Log Out",
      titleIndonesian: "Keluar",
      url: "/logout",
      icon: LogOut,
    },
  ],
};