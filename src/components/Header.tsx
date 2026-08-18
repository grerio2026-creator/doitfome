import { Link, useRouterState } from "@tanstack/react-router";
import { Briefcase, ChevronDown, LogOut, MessageSquare, Plus, Shield, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang)!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 px-2" aria-label="Language">
          <span className="text-base leading-none">{current.flag}</span>
          <span className="hidden text-xs sm:inline">{current.code.toUpperCase()}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} className="gap-2">
            <span className="text-base leading-none">{l.flag}</span>
            <span className={cn(l.code === lang && "font-semibold")}>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const { t } = useI18n();
  const { user, profile, isAdmin, openLogin, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/jobs", label: t("nav_feed"), icon: Briefcase },
    { to: "/workers", label: t("nav_workers"), icon: Users },
    { to: "/inbox", label: t("nav_inbox"), icon: MessageSquare },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
        <Link to="/" className="me-1 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            D4
          </span>
          <span className="hidden text-base font-bold tracking-tight sm:block">DoIt4Me</span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                pathname.startsWith(item.to)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="me-1 inline size-4 align-[-2px]" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1.5">
          <LanguageSwitcher />
          <Button asChild size="sm" className="bg-action text-action-foreground hover:bg-action/90">
            <Link to="/post-job">
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t("nav_post")}</span>
            </Link>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback>{(profile?.full_name ?? "U").slice(0, 1)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {profile?.full_name ?? "Pengguna"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/my-jobs">
                    <Briefcase className="size-4" />
                    Pekerjaan Saya
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account">Profil & Verifikasi</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/inbox">{t("nav_inbox")}</Link>
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Shield className="size-4" />
                      {t("nav_admin")}
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="size-4" />
                  {t("sign_out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" size="sm" onClick={() => openLogin()}>
              {t("sign_in")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
