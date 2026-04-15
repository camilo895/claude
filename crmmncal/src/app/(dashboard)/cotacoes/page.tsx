"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Search, MessageSquare, ChevronRight, Clock, AlertCircle } from "lucide-react";
import { formatBRL } from "@/lib/pricing";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Quotation {
  id: string;
  number: number;
  status: string;
  totalPrice: number;
  marginAvg: number;
  createdAt: string;
  customer: { name: string; phone: string | null; state: string; city: string | null };
  seller: { name: string };
  followUps: { dueDate: string; status: string }[];
  _count: { items: number };
}

// ── Status ────────────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; badge: string }> = {
  RASCUNHO:      { label: "Rascunho",      badge: "text-gray-500   bg-gray-100"   },
  ENVIADA:       { label: "Enviada",        badge: "text-blue-700   bg-blue-50"    },
  EM_FOLLOWUP:   { label: "Acompanhamento", badge: "text-amber-700  bg-amber-50"   },
  EM_NEGOCIACAO: { label: "Negociação",     badge: "text-purple-700 bg-purple-50"  },
  GANHA:         { label: "Ganha",          badge: "text-green-700  bg-green-50"   },
  PERDIDA:       { label: "Perdida",        badge: "text-red-600    bg-red-50"     },
};

const TABS = [
  { key: "",              label: "Todas"         },
  { key: "RASCUNHO",      label: "Rascunho"      },
  { key: "ENVIADA",       label: "Enviada"       },
  { key: "EM_FOLLOWUP",   label: "Acompanhamento"},
  { key: "EM_NEGOCIACAO", label: "Negociação"    },
  { key: "GANHA",         label: "Ganha"         },
  { key: "PERDIDA",       label: "Perdida"       },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 2) return "agora";
  if (m < 60) return `${m} min`;
  if (h < 24) return `${h}h atrás`;
  if (d === 1) return "ontem";
  return `${d} dias`;
}

function nextFollowUp(followUps: Quotation["followUps"]) {
  return followUps
    .filter((f) => f.status === "PENDENTE")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null;
}

function RowSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse flex items-center gap-4">
      <div className="h-3 w-8 bg-gray-100 rounded" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-48 bg-gray-100 rounded" />
        <div className="h-2.5 w-32 bg-gray-100 rounded" />
      </div>
      <div className="h-3 w-20 bg-gray-100 rounded" />
      <div className="h-3 w-16 bg-gray-100 rounded" />
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function CotacoesPage() {
  const { data: session } = useSession();
  const role  = (session?.user as { role?: string })?.role ?? "VENDEDOR";
  const userId = (session?.user as { id?: string })?.id;
  const isVendedor = role === "VENDEDOR";
  const showMargin = ["COORDENADOR", "GERENTE", "DIRETOR"].includes(role);

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Busca principal (com filtro de status e search)
  const load = useCallback(
    async (status: string, search: string) => {
      setLoading(true);
      try {
        const p = new URLSearchParams({ limit: "60" });
        if (status) p.set("status", status);
        if (search) p.set("search", search);
        if (isVendedor && userId) p.set("sellerId", userId);
        const res = await fetch(`/api/quotations?${p}`);
        const data = await res.json();
        setQuotations(data.quotations ?? []);
      } finally {
        setLoading(false);
      }
    },
    [isVendedor, userId]
  );

  // Contagens por status (sem filtro de status)
  const loadCounts = useCallback(async () => {
    const p = new URLSearchParams({ limit: "500" });
    if (isVendedor && userId) p.set("sellerId", userId);
    const res = await fetch(`/api/quotations?${p}`);
    const data = await res.json();
    const c: Record<string, number> = {};
    for (const q of data.quotations ?? []) {
      c[q.status] = (c[q.status] ?? 0) + 1;
    }
    setCounts(c);
  }, [isVendedor, userId]);

  // Recarrega lista ao mudar tab
  useEffect(() => { load(tab, query); }, [tab, load]); // eslint-disable-line
  // Debounce na busca
  useEffect(() => {
    const t = setTimeout(() => load(tab, query), 300);
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line
  // Contagens iniciais
  useEffect(() => { loadCounts(); }, [loadCounts]);

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cotações</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isVendedor ? "Suas cotações" : "Todas as cotações"}
          </p>
        </div>
        <Link
          href="/cotacoes/nova"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
        >
          <Plus className="w-4 h-4" />
          Nova cotação
        </Link>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome do cliente…"
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
        />
      </div>

      {/* Tabs de status */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = t.key ? (counts[t.key] ?? 0) : totalCount;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                tab === t.key
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    tab === t.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <RowSkeleton key={i} />)}
        </div>
      ) : quotations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">
            {query
              ? `Nenhuma cotação encontrada para "${query}"`
              : tab
              ? `Nenhuma cotação com status "${STATUS[tab]?.label}"`
              : "Nenhuma cotação criada ainda"}
          </p>
          <Link
            href="/cotacoes/nova"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Criar primeira cotação
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {quotations.map((q) => {
            const s = STATUS[q.status] ?? STATUS.RASCUNHO;
            const fu = nextFollowUp(q.followUps ?? []);
            const isOverdue = fu && new Date(fu.dueDate) < new Date();

            return (
              <Link
                key={q.id}
                href={`/cotacoes/${q.id}`}
                className="group flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-5 py-4 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                {/* Número */}
                <span className="font-mono text-xs text-gray-300 w-10 shrink-0">
                  #{q.number}
                </span>

                {/* Cliente + vendedor */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                    {q.customer.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">
                    {q.customer.city ? `${q.customer.city} · ` : ""}
                    {q.customer.state}
                    {!isVendedor && (
                      <span className="text-gray-300 ml-1">· {q.seller.name}</span>
                    )}
                  </p>
                </div>

                {/* Próximo follow-up */}
                {fu ? (
                  <div
                    className={`hidden sm:flex items-center gap-1 text-xs font-medium shrink-0 ${
                      isOverdue ? "text-red-500" : "text-amber-600"
                    }`}
                  >
                    {isOverdue ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                    {new Date(fu.dueDate).toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                ) : (
                  <span className="hidden sm:block w-16" />
                )}

                {/* Margem — só gestores */}
                {showMargin && (
                  <span className="hidden lg:block text-xs text-gray-400 w-12 text-right shrink-0">
                    {q.marginAvg.toFixed(1)}%
                  </span>
                )}

                {/* Valor */}
                <span className="text-sm font-bold text-gray-900 w-28 text-right shrink-0">
                  {formatBRL(q.totalPrice)}
                </span>

                {/* Badge de status */}
                <span
                  className={`hidden sm:inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${s.badge}`}
                >
                  {s.label}
                </span>

                {/* Tempo relativo */}
                <span className="text-xs text-gray-300 w-14 text-right shrink-0 group-hover:text-gray-400 transition-colors">
                  {relativeTime(q.createdAt)}
                </span>

                {/* WhatsApp inline */}
                {q.customer.phone && !["GANHA", "PERDIDA"].includes(q.status) && (
                  <a
                    href={`https://wa.me/55${q.customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Olá! Segue cotação #${q.number} da Mancal Matão no valor de ${formatBRL(q.totalPrice)}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 p-1.5 text-gray-300 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                    title="Enviar via WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                )}

                <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-gray-400 shrink-0 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
