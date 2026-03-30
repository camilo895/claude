"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Search,
  FileText,
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { formatBRL } from "@/lib/pricing";

interface DashboardData {
  quotationsTotal: number;
  quotationsToday: number;
  pipelineValue: number;
  totalGanho: number;
  followUpsPendentes: number;
  followUpsAtrasados: number;
  recentQuotations: Array<{
    id: string;
    number: number;
    status: string;
    totalPrice: number;
    customer: { name: string };
    createdAt: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  RASCUNHO: "bg-gray-100 text-gray-600",
  ENVIADA: "bg-blue-100 text-blue-700",
  EM_FOLLOWUP: "bg-yellow-100 text-yellow-700",
  EM_NEGOCIACAO: "bg-purple-100 text-purple-700",
  GANHA: "bg-green-100 text-green-700",
  PERDIDA: "bg-red-100 text-red-700",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [qRes, fuRes] = await Promise.all([
          fetch("/api/quotations?limit=200").then((r) => r.json()),
          fetch("/api/follow-ups?status=PENDENTE").then((r) => r.json()),
        ]);

        const quotations = qRes.quotations ?? [];
        const followUps = fuRes ?? [];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        setData({
          quotationsTotal: quotations.length,
          quotationsToday: quotations.filter(
            (q: { createdAt: string }) => new Date(q.createdAt) >= today
          ).length,
          pipelineValue: quotations
            .filter((q: { status: string }) => !["GANHA", "PERDIDA", "RASCUNHO"].includes(q.status))
            .reduce((sum: number, q: { totalPrice: number }) => sum + q.totalPrice, 0),
          totalGanho: quotations
            .filter((q: { status: string }) => q.status === "GANHA")
            .reduce((sum: number, q: { totalPrice: number }) => sum + q.totalPrice, 0),
          followUpsPendentes: followUps.length,
          followUpsAtrasados: followUps.filter(
            (fu: { dueDate: string }) => new Date(fu.dueDate) < now
          ).length,
          recentQuotations: quotations.slice(0, 5),
        });
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {session?.user?.name?.split(" ")[0] ?? "Usuário"}
        </h1>
        <p className="text-gray-500">
          Aqui está o resumo do seu dia — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/cotacoes" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <span className="text-xs text-gray-400">Hoje</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data?.quotationsToday ?? 0}</p>
          <p className="text-sm text-gray-500">Cotações criadas hoje</p>
        </Link>

        <Link href="/crm" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatBRL(data?.pipelineValue ?? 0)}</p>
          <p className="text-sm text-gray-500">Pipeline ativo</p>
        </Link>

        <Link href="/crm" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatBRL(data?.totalGanho ?? 0)}</p>
          <p className="text-sm text-gray-500">Total ganho</p>
        </Link>

        <Link
          href="/crm"
          className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${
            (data?.followUpsAtrasados ?? 0) > 0 ? "border-red-200" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            {(data?.followUpsAtrasados ?? 0) > 0 ? (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            ) : (
              <Clock className="w-5 h-5 text-yellow-500" />
            )}
          </div>
          <p className={`text-2xl font-bold ${(data?.followUpsAtrasados ?? 0) > 0 ? "text-red-600" : "text-gray-900"}`}>
            {data?.followUpsPendentes ?? 0}
          </p>
          <p className="text-sm text-gray-500">
            Follow-ups pendentes
            {(data?.followUpsAtrasados ?? 0) > 0 && (
              <span className="text-red-500 font-medium"> ({data?.followUpsAtrasados} atrasados)</span>
            )}
          </p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/precos"
          className="flex items-center gap-4 bg-blue-600 text-white rounded-xl p-5 hover:bg-blue-700 transition-colors"
        >
          <Search className="w-8 h-8 opacity-80" />
          <div>
            <p className="font-semibold">Consultar Preço</p>
            <p className="text-sm opacity-80">Buscar na tabela de preços</p>
          </div>
          <ArrowRight className="w-5 h-5 ml-auto" />
        </Link>

        <Link
          href="/cotacoes/nova"
          className="flex items-center gap-4 bg-green-600 text-white rounded-xl p-5 hover:bg-green-700 transition-colors"
        >
          <FileText className="w-8 h-8 opacity-80" />
          <div>
            <p className="font-semibold">Nova Cotação</p>
            <p className="text-sm opacity-80">Criar uma cotação</p>
          </div>
          <ArrowRight className="w-5 h-5 ml-auto" />
        </Link>

        <Link
          href="/performance"
          className="flex items-center gap-4 bg-purple-600 text-white rounded-xl p-5 hover:bg-purple-700 transition-colors"
        >
          <BarChart3 className="w-8 h-8 opacity-80" />
          <div>
            <p className="font-semibold">Minha Performance</p>
            <p className="text-sm opacity-80">Ver metas e resultados</p>
          </div>
          <ArrowRight className="w-5 h-5 ml-auto" />
        </Link>
      </div>

      {/* Recent quotations */}
      {data && data.recentQuotations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Últimas Cotações</h3>
            <Link href="/cotacoes" className="text-sm text-blue-600 hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentQuotations.map((q) => (
              <Link
                key={q.id}
                href={`/cotacoes/${q.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400">#{q.number}</span>
                  <span className="text-sm font-medium text-gray-900">{q.customer.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[q.status] ?? ""}`}>
                    {q.status.replace("_", " ")}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">{formatBRL(q.totalPrice)}</span>
                  <span className="block text-xs text-gray-400">
                    {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
