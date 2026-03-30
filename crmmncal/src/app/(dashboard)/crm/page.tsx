"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
} from "lucide-react";
import { formatBRL } from "@/lib/pricing";

interface Quotation {
  id: string;
  number: number;
  status: string;
  totalPrice: number;
  marginAvg: number;
  createdAt: string;
  sentAt: string | null;
  customer: { name: string; phone: string | null; state: string };
  seller: { name: string };
  _count: { items: number; followUps: number };
}

interface FollowUp {
  id: string;
  dueDate: string;
  status: string;
  quotation: {
    id: string;
    number: number;
    totalPrice: number;
    customer: { name: string; phone: string | null };
  };
}

const COLUMNS = [
  { key: "ENVIADA", label: "Cotação Enviada", color: "border-t-blue-500", bg: "bg-blue-50" },
  { key: "EM_FOLLOWUP", label: "Em Follow-up", color: "border-t-yellow-500", bg: "bg-yellow-50" },
  { key: "EM_NEGOCIACAO", label: "Em Negociação", color: "border-t-purple-500", bg: "bg-purple-50" },
  { key: "GANHA", label: "Ganha", color: "border-t-green-500", bg: "bg-green-50" },
  { key: "PERDIDA", label: "Perdida", color: "border-t-red-500", bg: "bg-red-50" },
];

export default function CRMPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "followups">("kanban");

  useEffect(() => {
    Promise.all([
      fetch("/api/quotations?limit=200").then((r) => r.json()),
      fetch("/api/follow-ups?status=PENDENTE").then((r) => r.json()),
    ]).then(([qData, fuData]) => {
      setQuotations(qData.quotations ?? []);
      setFollowUps(fuData ?? []);
      setLoading(false);
    });
  }, []);

  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: quotations.filter((q) => q.status === col.key),
  }));

  const totalPipeline = quotations
    .filter((q) => !["GANHA", "PERDIDA"].includes(q.status))
    .reduce((sum, q) => sum + q.totalPrice, 0);

  const totalGanho = quotations
    .filter((q) => q.status === "GANHA")
    .reduce((sum, q) => sum + q.totalPrice, 0);

  const overdueFollowUps = followUps.filter(
    (fu) => new Date(fu.dueDate) < new Date()
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando CRM...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">CRM — Pipeline de Vendas</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer ${view === "kanban" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Kanban
          </button>
          <button
            onClick={() => setView("followups")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer relative ${view === "followups" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Follow-ups
            {overdueFollowUps.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {overdueFollowUps.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Pipeline Ativo</p>
          <p className="text-xl font-bold text-gray-900">{formatBRL(totalPipeline)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Ganho</p>
          <p className="text-xl font-bold text-green-600">{formatBRL(totalGanho)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Cotações no Pipeline</p>
          <p className="text-xl font-bold text-gray-900">{quotations.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Follow-ups Pendentes</p>
          <p className={`text-xl font-bold ${overdueFollowUps.length > 0 ? "text-red-600" : "text-yellow-600"}`}>
            {followUps.length}
            {overdueFollowUps.length > 0 && (
              <span className="text-sm font-normal text-red-500 ml-1">({overdueFollowUps.length} atrasados)</span>
            )}
          </p>
        </div>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {grouped.map((column) => (
            <div key={column.key} className={`flex-shrink-0 w-80 bg-gray-50 rounded-xl border-t-4 ${column.color}`}>
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700 text-sm">{column.label}</h3>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    {column.items.length}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatBRL(column.items.reduce((sum, q) => sum + q.totalPrice, 0))}
                </p>
              </div>

              <div className="p-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
                {column.items.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-8">Nenhuma cotação</p>
                )}
                {column.items.map((q) => (
                  <Link
                    key={q.id}
                    href={`/cotacoes/${q.id}`}
                    className="block bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-mono text-gray-400">#{q.number}</span>
                      <span className="text-sm font-bold text-gray-900">{formatBRL(q.totalPrice)}</span>
                    </div>
                    <p className="font-medium text-sm text-gray-800 mb-0.5">{q.customer.name}</p>
                    <p className="text-xs text-gray-500">{q.customer.state} — {q._count.items} itens</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                      <div className="flex items-center gap-1">
                        {q.customer.phone && (
                          <span className="p-1 text-green-500"><MessageSquare className="w-3.5 h-3.5" /></span>
                        )}
                        {q._count.followUps > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-yellow-600">
                            <Clock className="w-3 h-3" />{q._count.followUps}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Follow-ups View */}
      {view === "followups" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cotação</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Valor</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {followUps.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum follow-up pendente</td></tr>
              )}
              {followUps.map((fu) => {
                const isOverdue = new Date(fu.dueDate) < new Date();
                return (
                  <tr key={fu.id} className={isOverdue ? "bg-red-50" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3">
                      <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                        {new Date(fu.dueDate).toLocaleDateString("pt-BR")}
                      </span>
                      {isOverdue && <AlertTriangle className="inline w-3.5 h-3.5 text-red-500 ml-1" />}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-yellow-600"}`}>
                        {isOverdue ? "ATRASADO" : "PENDENTE"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/cotacoes/${fu.quotation.id}`} className="text-blue-600 hover:underline">
                        #{fu.quotation.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{fu.quotation.customer.name}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatBRL(fu.quotation.totalPrice)}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/cotacoes/${fu.quotation.id}`}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
