"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Send, Eye, Filter } from "lucide-react";
import { formatBRL } from "@/lib/pricing";

interface Quotation {
  id: string;
  number: number;
  status: string;
  marketType: string;
  totalPrice: number;
  marginAvg: number;
  createdAt: string;
  sentAt: string | null;
  customer: { name: string; phone: string | null; state: string };
  seller: { name: string };
  _count: { items: number; followUps: number };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RASCUNHO: { label: "Rascunho", color: "bg-gray-100 text-gray-600" },
  ENVIADA: { label: "Enviada", color: "bg-blue-100 text-blue-700" },
  EM_FOLLOWUP: { label: "Em Follow-up", color: "bg-yellow-100 text-yellow-700" },
  EM_NEGOCIACAO: { label: "Em Negociação", color: "bg-purple-100 text-purple-700" },
  GANHA: { label: "Ganha", color: "bg-green-100 text-green-700" },
  PERDIDA: { label: "Perdida", color: "bg-red-100 text-red-700" },
};

export default function CotacoesPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);

    fetch(`/api/quotations?${params}`)
      .then((res) => res.json())
      .then((data) => setQuotations(data.quotations ?? []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cotações</h1>
        <a
          href="/cotacoes/nova"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Nova Cotação
        </a>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Vendedor</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Itens</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Margem</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && quotations.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  Nenhuma cotação encontrada
                </td>
              </tr>
            )}
            {quotations.map((q) => {
              const status = STATUS_LABELS[q.status] ?? STATUS_LABELS.RASCUNHO;
              return (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium">#{q.number}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{q.customer.name}</span>
                    <span className="block text-xs text-gray-400">{q.customer.state}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{q.seller.name}</td>
                  <td className="px-4 py-3 text-center">{q._count.items}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatBRL(q.totalPrice)}
                  </td>
                  <td className="px-4 py-3 text-center">{q.marginAvg.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/cotacoes/${q.id}`} className="p-1.5 text-gray-400 hover:text-gray-600 rounded" title="Ver detalhes">
                        <Eye className="w-4 h-4" />
                      </Link>
                      {q.customer.phone && q.status !== "GANHA" && q.status !== "PERDIDA" && (
                        <a
                          href={`https://wa.me/55${q.customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Segue cotação #${q.number} no valor de ${formatBRL(q.totalPrice)}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-green-500 hover:text-green-700 rounded"
                          title="Enviar via WhatsApp"
                        >
                          <Send className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
