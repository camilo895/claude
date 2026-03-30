"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
  Tag,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { formatBRL } from "@/lib/pricing";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Quotation {
  id: string;
  number: number;
  status: string;
  totalPrice: number;
  customer: { name: string };
  createdAt: string;
}

interface DashboardData {
  quotationsToday: number;
  pipelineValue: number;
  totalGanho: number;
  followUpsPendentes: number;
  followUpsAtrasados: number;
  recentQuotations: Quotation[];
}

// ── Status ────────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  EM_FOLLOWUP: "Acompanhamento",
  EM_NEGOCIACAO: "Negociação",
  GANHA: "Ganha",
  PERDIDA: "Perdida",
};

const STATUS_STYLE: Record<string, string> = {
  RASCUNHO: "text-gray-500 bg-gray-100",
  ENVIADA: "text-blue-700 bg-blue-50",
  EM_FOLLOWUP: "text-amber-700 bg-amber-50",
  EM_NEGOCIACAO: "text-purple-700 bg-purple-50",
  GANHA: "text-green-700 bg-green-50",
  PERDIDA: "text-red-600 bg-red-50",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 2) return "agora";
  if (m < 60) return `${m} min atrás`;
  if (h < 24) return `${h}h atrás`;
  if (d === 1) return "ontem";
  return `${d} dias atrás`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({
  label,
  value,
  sub,
  href,
  alert,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group bg-white rounded-2xl border px-5 py-4 flex flex-col gap-1 hover:shadow-sm transition-all ${
        alert ? "border-red-200" : "border-gray-100"
      }`}
    >
      <span className="text-[12px] font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <span
        className={`text-2xl font-bold tracking-tight ${
          alert ? "text-red-600" : "text-gray-900"
        }`}
      >
        {value}
      </span>
      {sub && (
        <span
          className={`text-xs font-medium ${
            alert ? "text-red-500" : "text-gray-400"
          }`}
        >
          {sub}
        </span>
      )}
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-64" />
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [qRes, fuRes] = await Promise.all([
          fetch("/api/quotations?limit=200").then((r) => r.json()),
          fetch("/api/follow-ups?status=PENDENTE").then((r) => r.json()),
        ]);
        const quotations: Quotation[] = qRes.quotations ?? [];
        const followUps = fuRes ?? [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        setData({
          quotationsToday: quotations.filter(
            (q) => new Date(q.createdAt) >= today
          ).length,
          pipelineValue: quotations
            .filter((q) => !["GANHA", "PERDIDA", "RASCUNHO"].includes(q.status))
            .reduce((s, q) => s + q.totalPrice, 0),
          totalGanho: quotations
            .filter((q) => q.status === "GANHA")
            .reduce((s, q) => s + q.totalPrice, 0),
          followUpsPendentes: followUps.length,
          followUpsAtrasados: followUps.filter(
            (fu: { dueDate: string }) => new Date(fu.dueDate) < new Date()
          ).length,
          recentQuotations: quotations.slice(0, 6),
        });
      } catch {
        /* silently fail */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const firstName = session?.user?.name?.split(" ")[0] ?? "Usuário";
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const atrasados = data?.followUpsAtrasados ?? 0;

  return (
    <div className="space-y-8">

      {/* Cabeçalho */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{today}</p>
        </div>
        <Link
          href="/cotacoes/nova"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
        >
          <Plus className="w-4 h-4" />
          Nova cotação
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Cotações hoje"
          value={data?.quotationsToday ?? 0}
          href="/cotacoes"
        />
        <KPICard
          label="Pipeline ativo"
          value={formatBRL(data?.pipelineValue ?? 0)}
          sub="em aberto"
          href="/crm"
        />
        <KPICard
          label="Total ganho"
          value={formatBRL(data?.totalGanho ?? 0)}
          href="/crm"
        />
        <KPICard
          label="Follow-ups"
          value={data?.followUpsPendentes ?? 0}
          sub={atrasados > 0 ? `${atrasados} atrasado${atrasados > 1 ? "s" : ""}` : "em dia"}
          href="/crm"
          alert={atrasados > 0}
        />
      </div>

      {/* Ações rápidas */}
      <div>
        <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3">
          Ações rápidas
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/precos"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <Tag className="w-4 h-4 text-blue-500" />
            Consultar preço
          </Link>
          <Link
            href="/cotacoes/nova"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-green-500" />
            Nova cotação
          </Link>
          <Link
            href="/crm"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <TrendingUp className="w-4 h-4 text-purple-500" />
            Ver pipeline
          </Link>
          {atrasados > 0 && (
            <Link
              href="/crm"
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl hover:border-red-300 transition-all"
            >
              <AlertCircle className="w-4 h-4" />
              {atrasados} follow-up{atrasados > 1 ? "s" : ""} atrasado{atrasados > 1 ? "s" : ""}
            </Link>
          )}
        </div>
      </div>

      {/* Cotações recentes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">
            Cotações recentes
          </p>
          <Link
            href="/cotacoes"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver todas <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {(data?.recentQuotations.length ?? 0) === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 px-6 py-12 text-center">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Nenhuma cotação ainda</p>
            <Link
              href="/cotacoes/nova"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Criar primeira cotação
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <ul className="divide-y divide-gray-50">
              {data!.recentQuotations.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/cotacoes/${q.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group"
                  >
                    {/* Número */}
                    <span className="font-mono text-xs text-gray-300 w-10 shrink-0">
                      #{q.number}
                    </span>

                    {/* Cliente */}
                    <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                      {q.customer.name}
                    </span>

                    {/* Status */}
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        STATUS_STYLE[q.status] ?? "text-gray-500 bg-gray-100"
                      }`}
                    >
                      {STATUS_LABEL[q.status] ?? q.status}
                    </span>

                    {/* Valor */}
                    <span className="text-sm font-semibold text-gray-900 w-28 text-right shrink-0">
                      {formatBRL(q.totalPrice)}
                    </span>

                    {/* Tempo */}
                    <span className="text-xs text-gray-300 w-20 text-right shrink-0 group-hover:text-gray-400 transition-colors">
                      {relativeTime(q.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
