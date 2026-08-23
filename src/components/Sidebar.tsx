import { Link, useRouterState } from "@tanstack/react-router";
import {
  Briefcase,
  Home,
  MessageSquare,
  Search,
  Shield,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import logo from "@/assets/logo.png";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { t } = useI18n();
  const { user, isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/", label: t("nav_home"), icon: Home, exact: true },
    { to: "/jobs", label: t("nav_feed"), icon: Search, exact: false },
    { to: "/workers", label: t("nav_workers"), icon: Users, exact: false },
    { to: "/inbox", label: t("nav_inbox"), icon: MessageSquare, exact: false },
    ...(user
      ? [
          { to: "/my-jobs", label: t("nav_myjobs"), icon: Briefcase, exact: false },
          { to: "/account", label: t("nav_account"), icon: UserRound, exact: false },
        ]
      : []),
    ...(isAdmin
      ? [{ to: "/admin", label: t("nav_admin"), icon: Shield, exact: false }]
      : []),
  ];

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col border-e border-sidebar-border bg-sidebar lg:flex">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
        <img src={logo} alt="DoIt4Me" className="size-9 rounded-xl object-contain" />
        <span className="text-lg font-extrabold tracking-tight text-foreground">DoIt4Me</span>
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active = isActive(item.to, item.exact);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-gradient text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <div className="rounded-2xl border border-border bg-accent/60 p-4">
          <div className="flex items-center gap-2 text-accent-foreground">
            <ShieldCheck className="size-5" />
            <p className="text-sm font-bold">{t("side_secure_title")}</p>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("side_secure_sub")}
          </p>
        </div>
      </div>
    </aside>
  );
}
