"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Home,
  Tag,
  FileText,
  LayoutDashboard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  TableProperties,
} from "lucide-react";
import { useState } from "react";

const baseNav = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Consulta de Preços", href: "/precos", icon: Tag },
  { name: "Cotações", href: "/cotacoes", icon: FileText },
  { name: "CRM", href: "/crm", icon: LayoutDashboard },
  { name: "Performance", href: "/performance", icon: BarChart3 },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

const managerNav = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Consulta de Preços", href: "/precos", icon: Tag },
  { name: "Gestão de Preços", href: "/precos/gestao", icon: TableProperties },
  { name: "Cotações", href: "/cotacoes", icon: FileText },
  { name: "CRM", href: "/crm", icon: LayoutDashboard },
  { name: "Performance", href: "/performance", icon: BarChart3 },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

function isManager(role?: string) {
  return ["COORDENADOR", "GERENTE", "DIRETOR"].includes(role ?? "");
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = (session?.user as { role?: string })?.role;
  const navigation = isManager(role) ? managerNav : baseNav;

  const navContent = (
    <>
      <div className="flex items-center gap-2 px-4 py-6 border-b border-gray-700">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">
          CM
        </div>
        <span className="text-lg font-semibold text-white">CRM Mancal</span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          // Indenta "Gestão de Preços" visualmente sob "Consulta"
          const isSubItem = item.href === "/precos/gestao";

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isSubItem ? "ml-4 py-2" : ""
              } ${
                isActive
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
              }`}
            >
              <item.icon className={`shrink-0 ${isSubItem ? "w-4 h-4" : "w-5 h-5"}`} />
              <span className={isSubItem ? "text-xs" : ""}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {session?.user && (
        <div className="px-4 py-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            {session.user.image && (
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-400 truncate">{role}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-400 hover:text-white cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-800 text-white cursor-pointer"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gray-800 flex flex-col transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
