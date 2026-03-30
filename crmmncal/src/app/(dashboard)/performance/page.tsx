"use client";

import { useState, useEffect } from "react";
import {
  Target,
  TrendingUp,
  FileText,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Users,
} from "lucide-react";
import { formatBRL } from "@/lib/pricing";
import { useSession } from "next-auth/react";

interface GoalData {
  targetAmount: number;
  achievedAmount: number;
  conversionRate: number;
  avgTicket: number;
}

interface StatsData {
  quotationsTotal: number;
  quotationsToday: number;
  quotationsWeek: number;
  ganhas: number;
  perdidas: number;
  enviadas: number;
  emNegociacao: number;
  totalGanho: number;
}

export default function PerformancePage() {
  const { data: session } = useSession();
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch goals
        const goalsRes = await fetch(`/api/goals?month=${currentMonth}&year=${currentYear}`);
        const goals = await goalsRes.json();
        if (goals.length > 0) {
          setGoal(goals[0]);
        }

        // Fetch quotations for stats
        const qRes = await fetch("/api/quotations?limit=500");
        const qData = await qRes.json();
        const quotations = qData.quotations ?? [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const monthQuotations = quotations.filter((q: { createdAt: string }) => {
          const d = new Date(q.createdAt);
          return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
        });

        setStats({
          quotationsTotal: monthQuotations.length,
          quotationsToday: quotations.filter((q: { createdAt: string }) => new Date(q.createdAt) >= today).length,
          quotationsWeek: quotations.filter((q: { createdAt: string }) => new Date(q.createdAt) >= weekAgo).length,
          ganhas: monthQuotations.filter((q: { status: string }) => q.status === "GANHA").length,
          perdidas: monthQuotations.filter((q: { status: string }) => q.status === "PERDIDA").length,
          enviadas: monthQuotations.filter((q: { status: string }) => !["GANHA", "PERDIDA", "RASCUNHO"].includes(q.status)).length,
          emNegociacao: monthQuotations.filter((q: { status: string }) => q.status === "EM_NEGOCIACAO").length,
          totalGanho: monthQuotations
            .filter((q: { status: string }) => q.status === "GANHA")
            .reduce((sum: number, q: { totalPrice: number }) => sum + q.totalPrice, 0),
        });
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentMonth, currentYear]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando performance...</div>;
  }

  // Cálculos
  const targetAmount = goal?.targetAmount ?? 100000;
  const achievedAmount = stats?.totalGanho ?? 0;
  const conversionRate = goal?.conversionRate ?? 10;
  const avgTicket = goal?.avgTicket ?? 800;
  const workingDays = 22;
  const dayOfMonth = now.getDate();
  const workingDaysPassed = Math.min(dayOfMonth, workingDays);

  const progressPercent = targetAmount > 0 ? (achievedAmount / targetAmount) * 100 : 0;
  const dailyTarget = targetAmount / workingDays;
  const expectedToDate = dailyTarget * workingDaysPassed;
  const gap = achievedAmount - expectedToDate;
  const isOnTrack = gap >= 0;

  const dailyQuotationTarget = Math.ceil(
    dailyTarget / (avgTicket * (conversionRate / 100))
  );
  const remainingDays = Math.max(workingDays - workingDaysPassed, 1);
  const remainingAmount = Math.max(targetAmount - achievedAmount, 0);
  const newDailyTarget = remainingAmount / remainingDays;
  const newDailyQuotations = Math.ceil(
    newDailyTarget / (avgTicket * (conversionRate / 100))
  );

  const quotationsToday = stats?.quotationsToday ?? 0;
  const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance</h1>
          <p className="text-gray-500 capitalize">
            {session?.user?.name ?? "Vendedor"} — {monthName}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Meta do Mês</span>
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatBRL(targetAmount)}</p>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${progressPercent >= 100 ? "bg-green-500" : progressPercent >= 70 ? "bg-blue-500" : progressPercent >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatBRL(achievedAmount)} ({progressPercent.toFixed(1)}%)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Cotações Hoje</span>
            <FileText className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {quotationsToday}
            <span className="text-sm font-normal text-gray-400"> / {dailyQuotationTarget} meta</span>
          </p>
          <p className="text-xs mt-2">
            {quotationsToday >= dailyQuotationTarget ? (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Meta do dia atingida!
              </span>
            ) : (
              <span className="text-yellow-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Faltam {dailyQuotationTarget - quotationsToday} cotações
              </span>
            )}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Taxa de Conversão</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
          <p className="text-xs text-gray-500 mt-2">
            {stats?.ganhas ?? 0} ganhas de {stats?.quotationsTotal ?? 0} cotações
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Ticket Médio</span>
            <BarChart3 className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatBRL(avgTicket)}</p>
          <p className="text-xs text-gray-500 mt-2">
            Baseado nas últimas {stats?.quotationsTotal ?? 0} cotações
          </p>
        </div>
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projeção */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Projeção da Meta</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Meta diária original:</span>
              <span className="font-medium">{formatBRL(dailyTarget)}/dia</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Esperado até hoje ({workingDaysPassed} dias úteis):</span>
              <span className="font-medium">{formatBRL(expectedToDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Realizado:</span>
              <span className="font-medium">{formatBRL(achievedAmount)}</span>
            </div>
            <div className={`flex justify-between text-sm font-semibold ${isOnTrack ? "text-green-600" : "text-red-600"}`}>
              <span>Gap:</span>
              <span>{isOnTrack ? "+" : ""}{formatBRL(gap)}</span>
            </div>

            <hr className="border-gray-200" />

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Dias restantes:</span>
              <span className="font-medium">{remainingDays} dias</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Falta vender:</span>
              <span className="font-medium">{formatBRL(remainingAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-blue-600">
              <span>Nova meta diária:</span>
              <span>{formatBRL(newDailyTarget)}/dia</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-purple-600">
              <span>Cotações/dia necessárias:</span>
              <span>{newDailyQuotations} cotações/dia</span>
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Pipeline do Mês</h3>
          <div className="space-y-3">
            {[
              { label: "Em andamento", value: stats?.enviadas ?? 0, color: "bg-blue-500" },
              { label: "Em negociação", value: stats?.emNegociacao ?? 0, color: "bg-purple-500" },
              { label: "Ganhas", value: stats?.ganhas ?? 0, color: "bg-green-500" },
              { label: "Perdidas", value: stats?.perdidas ?? 0, color: "bg-red-500" },
            ].map((item) => {
              const total = stats?.quotationsTotal ?? 1;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${(item.value / total) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total de cotações no mês:</span>
              <span className="font-bold text-gray-900">{stats?.quotationsTotal ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Cotações esta semana:</span>
              <span className="font-medium">{stats?.quotationsWeek ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
