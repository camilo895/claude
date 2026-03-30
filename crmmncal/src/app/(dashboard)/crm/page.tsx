"use client";

import { useState, useEffect } from "react";
import { Phone, Mail, MessageSquare, Calendar, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { formatBRL } from "@/lib/pricing";

interface Quotation {
  id: string;
  number: number;
  status: string;
  totalPrice: number;
  createdAt: string;
  sentAt: string | null;
  customer: { name: string; phone: string | null; state: string };
  seller: { name: string };
  _count: { items: number; followUps: number };
}

const COLUMNS = [
  { key: "ENVIADA", label: "Cotação Enviada", color: "border-t-blue-500" },
  { key: "EM_FOLLOWUP", label: "Em Follow-up", color: "border-t-yellow-500" },
  { key: "EM_NEGOCIACAO", label: "Em Negociação", color: "border-t-purple-500" },
  { key: "GANHA", label: "Ganha", color: "border-t-green-500" },
  { key: "PERDIDA", label: "Perdida", color: "border-t-red-500" },
];

export default function CRMPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/quotations?limit=100")
      .then((res) => res.json())
      .then((data) => setQuotations(data.quotations ?? []))
      .finally(() => setLoading(false));
  }, []);

  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: quotations.filter((q) => q.status === col.key),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Carregando CRM...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">CRM — Pipeline de Vendas</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{quotations.length} cotações no pipeline</span>
          <span className="font-semibold text-green-600">
            {formatBRL(
              quotations
                .filter((q) => q.status === "GANHA")
                .reduce((sum, q) => sum + q.totalPrice, 0)
            )}{" "}
            ganho
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {grouped.map((column) => (
          <div
            key={column.key}
            className={`flex-shrink-0 w-72 bg-gray-50 rounded-xl border-t-4 ${column.color}`}
          >
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

            <div className="p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {column.items.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-8">
                  Nenhuma cotação
                </p>
              )}
              {column.items.map((q) => (
                <div
                  key={q.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono text-gray-400">#{q.number}</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatBRL(q.totalPrice)}
                    </span>
                  </div>

                  <p className="font-medium text-sm text-gray-800 mb-1">
                    {q.customer.name}
                  </p>
                  <p className="text-xs text-gray-500">{q.customer.state}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    <div className="flex items-center gap-1">
                      {q.customer.phone && (
                        <a
                          href={`https://wa.me/55${q.customer.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-green-500 hover:bg-green-50 rounded"
                          title="WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button className="p-1 text-blue-500 hover:bg-blue-50 rounded cursor-pointer" title="Ligar">
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1 text-gray-400 hover:bg-gray-50 rounded cursor-pointer" title="Agendar">
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {q._count.followUps > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600">
                      <Clock className="w-3 h-3" />
                      {q._count.followUps} follow-up(s)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
