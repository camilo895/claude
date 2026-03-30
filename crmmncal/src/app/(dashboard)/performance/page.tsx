"use client";

import { useState } from "react";
import { Target, TrendingUp, FileText, CheckCircle, AlertTriangle, BarChart3 } from "lucide-react";
import { formatBRL } from "@/lib/pricing";

// Dados simulados para demonstração
const MOCK_DATA = {
  seller: {
    name: "João Silva",
    role: "Vendedor",
    month: "Março 2026",
  },
  goal: {
    targetAmount: 100000,
    achievedAmount: 42500,
    conversionRate: 10,
    avgTicket: 800,
    workingDays: 22,
    workingDaysPassed: 15,
  },
  quotations: {
    total: 68,
    today: 4,
    week: 18,
  },
  pipeline: {
    enviadas: 25,
    emNegociacao: 12,
    ganhas: 18,
    perdidas: 13,
  },
};

export default function PerformancePage() {
  const [data] = useState(MOCK_DATA);
  const { goal, quotations, pipeline, seller } = data;

  // Cálculos de performance
  const progressPercent = (goal.achievedAmount / goal.targetAmount) * 100;
  const dailyTarget = goal.targetAmount / goal.workingDays;
  const expectedToDate = dailyTarget * goal.workingDaysPassed;
  const gap = goal.achievedAmount - expectedToDate;
  const isOnTrack = gap >= 0;

  // Meta de cotações diárias
  const dailySalesTarget = dailyTarget;
  const dailyQuotationTarget = Math.ceil(
    dailySalesTarget / (goal.avgTicket * (goal.conversionRate / 100))
  );
  const remainingDays = goal.workingDays - goal.workingDaysPassed;
  const remainingAmount = goal.targetAmount - goal.achievedAmount;
  const newDailyTarget = remainingDays > 0 ? remainingAmount / remainingDays : 0;
  const newDailyQuotations = Math.ceil(
    newDailyTarget / (goal.avgTicket * (goal.conversionRate / 100))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance</h1>
          <p className="text-gray-500">
            {seller.name} — {seller.month}
          </p>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Meta */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Meta do Mês</span>
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatBRL(goal.targetAmount)}
          </p>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${progressPercent >= 100 ? "bg-green-500" : progressPercent >= 70 ? "bg-blue-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatBRL(goal.achievedAmount)} ({progressPercent.toFixed(1)}%)
            </p>
          </div>
        </div>

        {/* Cotações hoje */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Cotações Hoje</span>
            <FileText className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {quotations.today}
            <span className="text-sm font-normal text-gray-400">
              {" "}/ {dailyQuotationTarget} meta
            </span>
          </p>
          <p className="text-xs mt-2">
            {quotations.today >= dailyQuotationTarget ? (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Meta do dia atingida
              </span>
            ) : (
              <span className="text-yellow-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Faltam{" "}
                {dailyQuotationTarget - quotations.today} cotações
              </span>
            )}
          </p>
        </div>

        {/* Taxa de conversão */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Taxa de Conversão</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {goal.conversionRate}%
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {pipeline.ganhas} ganhas de {quotations.total} cotações
          </p>
        </div>

        {/* Ticket médio */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Ticket Médio</span>
            <BarChart3 className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatBRL(goal.avgTicket)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Baseado nas últimas {quotations.total} cotações
          </p>
        </div>
      </div>

      {/* Status detalhado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projeção */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Projeção da Meta</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Meta diária original:</span>
              <span className="font-medium">{formatBRL(dailyTarget)}/dia</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Esperado até hoje:</span>
              <span className="font-medium">{formatBRL(expectedToDate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Realizado:</span>
              <span className="font-medium">{formatBRL(goal.achievedAmount)}</span>
            </div>
            <div
              className={`flex justify-between text-sm font-semibold ${isOnTrack ? "text-green-600" : "text-red-600"}`}
            >
              <span>Gap:</span>
              <span>
                {isOnTrack ? "+" : ""}
                {formatBRL(gap)}
              </span>
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

        {/* Pipeline resumo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Pipeline</h3>
          <div className="space-y-3">
            {[
              { label: "Cotações enviadas", value: pipeline.enviadas, color: "bg-blue-500" },
              {
                label: "Em negociação",
                value: pipeline.emNegociacao,
                color: "bg-purple-500",
              },
              { label: "Ganhas", value: pipeline.ganhas, color: "bg-green-500" },
              { label: "Perdidas", value: pipeline.perdidas, color: "bg-red-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{
                      width: `${quotations.total > 0 ? (item.value / quotations.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total de cotações no mês:</span>
              <span className="font-bold text-gray-900">{quotations.total}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Cotações esta semana:</span>
              <span className="font-medium">{quotations.week}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
