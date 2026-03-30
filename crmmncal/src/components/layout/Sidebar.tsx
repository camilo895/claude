"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Home,
  Tag,
  FileText,
  Users2,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  TableProperties,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const ALL_GROUPS: NavGroup[] = [
  {
    label: "Comercial",
    items: [
      { name: "Dashboard", href: "/", icon: Home },
      { name: "CRM Pipeline", href: "/crm", icon: Users2 },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { name: "Consulta de Preços", href: "/precos", icon: Tag },
      { name: "Cotações", href: "/cotacoes", icon: FileText },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        name: "Gestão de Preços",
        href: "/precos/gestao",
        icon: TableProperties,
        roles: ["COORDENADOR", "GERENTE", "DIRETOR"],
      },
      {
        name: "Performance",
        href: "/performance",
        icon: BarChart3,
      },
      {
        name: "Configurações",
        href: "/configuracoes",
        icon: Settings,
        roles: ["COORDENADOR", "GERENTE", "DIRETOR"],
      },
    ],
  },
];

function canSee(item: NavItem, role?: string) {
  if (!item.roles) return true;
  return item.roles.includes(role ?? "");
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const isActive =
    item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <item.icon
        className={`w-4 h-4 shrink-0 transition-colors ${
          isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
        }`}
      />
      <span className="flex-1 truncate">{item.name}</span>
      {isActive && <ChevronRight className="w-3 h-3 text-blue-400" />}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = (session?.user as { role?: string })?.role;
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-white font-black text-sm tracking-tight">M</span>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-gray-900">Mancal Matão</p>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
              Grupo Piccin
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {ALL_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => canSee(item, role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-2.5 mb-1.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      {session?.user && (
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-2">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-7 h-7 rounded-full shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-blue-700 font-bold text-xs">{firstName[0]}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-gray-900 truncate leading-tight">
                {session.user.name}
              </p>
              <p className="text-[10px] text-gray-400 font-medium truncate leading-tight">
                {role}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-300 hover:text-gray-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-gray-100"
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white border border-gray-200 text-gray-700 shadow-sm cursor-pointer"
      >
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
