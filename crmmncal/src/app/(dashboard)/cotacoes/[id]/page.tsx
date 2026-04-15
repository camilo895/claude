"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, FileDown, MessageSquare, Phone, Mail, Calendar,
  Clock, CheckCircle2, XCircle, Plus, RotateCw, CheckCircle, AlertCircle,
} from "lucide-react";
import { formatBRL } from "@/lib/pricing";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Quotation {
  id: string; number: number; status: string; marketType: string;
  totalPrice: number; totalCost: number; marginAvg: number;
  notes: string | null; validUntil: string | null;
  createdAt: string; sentAt: string | null; wonAt: string | null;
  lostAt: string | null; lostReason: string | null;
  customer: { id: string; name: string; cnpj: string | null; phone: string | null; email: string | null; state: string; city: string | null };
  seller: { id: string; name: string | null; email: string | null };
  items: Array<{ id: string; quantity: number; unitCost: number; margin: number; unitPrice: number; totalPrice: number; product: { code: string; description: string | null } }>;
  followUps: Array<{ id: string; dueDate: string; status: string; notes: string | null; completedAt: string | null }>;
  activities: Array<{ id: string; type: string; description: string; createdAt: string; user: { name: string | null } }>;
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
const PIPELINE = [
  { key: "RASCUNHO",      label: "Rascunho"      },
  { key: "ENVIADA",       label: "Enviada"        },
  { key: "EM_FOLLOWUP",   label: "Acompanhamento" },
  { key: "EM_NEGOCIACAO", label: "Negociação"     },
];

const TERMINAL: Record<string, { label: string; textColor: string; borderBg: string }> = {
  GANHA:   { label: "Negócio fechado!",  textColor: "text-green-700", borderBg: "bg-green-50 border-green-200" },
  PERDIDA: { label: "Cotação perdida",   textColor: "text-red-600",   borderBg: "bg-red-50 border-red-200"     },
};

const NEXT_ACTIONS: Record<string, { key: string; label: string; variant: string }[]> = {
  RASCUNHO:      [{ key: "ENVIADA",       label: "Marcar como Enviada",        variant: "primary"  }],
  ENVIADA:       [{ key: "EM_FOLLOWUP",   label: "Iniciar Acompanhamento",     variant: "default"  },
                  { key: "EM_NEGOCIACAO", label: "Avançar para Negociação",    variant: "default"  },
                  { key: "GANHA",         label: "Marcar como Ganha",          variant: "success"  },
                  { key: "PERDIDA",       label: "Marcar como Perdida",        variant: "danger"   }],
  EM_FOLLOWUP:   [{ key: "EM_NEGOCIACAO", label: "Avançar para Negociação",    variant: "primary"  },
                  { key: "GANHA",         label: "Marcar como Ganha",          variant: "success"  },
                  { key: "PERDIDA",       label: "Marcar como Perdida",        variant: "danger"   }],
  EM_NEGOCIACAO: [{ key: "GANHA",         label: "Marcar como Ganha",          variant: "success"  },
                  { key: "PERDIDA",       label: "Marcar como Perdida",        variant: "danger"   }],
};

// ── Atividades ────────────────────────────────────────────────────────────────
const ACT_TYPES = [
  { value: "NOTA",     label: "Nota",     icon: Plus         },
  { value: "LIGACAO",  label: "Ligação",  icon: Phone        },
  { value: "EMAIL",    label: "E-mail",   icon: Mail         },
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageSquare},
  { value: "REUNIAO",  label: "Reunião",  icon: Calendar     },
];

const FU_BADGE: Record<string, string> = {
  PENDENTE:  "text-amber-700 bg-amber-50",
  ATRASADO:  "text-red-600   bg-red-50",
  REALIZADO: "text-green-700 bg-green-50",
  CANCELADO: "text-gray-400  bg-gray-100",
};
const FU_LABEL: Record<string, string> = {
  PENDENTE: "Pendente", ATRASADO: "Atrasado", REALIZADO: "Realizado", CANCELADO: "Cancelado",
};

function relativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), day = Math.floor(diff / 86400000);
  if (m < 2) return "agora"; if (m < 60) return `${m} min atrás`;
  if (h < 24) return `${h}h atrás`; if (day === 1) return "ontem"; return `${day} dias atrás`;
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-gray-200 rounded-xl" />
      <div className="h-14 bg-white rounded-2xl border border-gray-100" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="h-52 bg-white rounded-2xl border border-gray-100" />
          <div className="h-28 bg-white rounded-2xl border border-gray-100" />
        </div>
        <div className="space-y-4">
          <div className="h-36 bg-white rounded-2xl border border-gray-100" />
          <div className="h-28 bg-white rounded-2xl border border-gray-100" />
        </div>
      </div>
    </div>
  );
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function CotacaoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "VENDEDOR";
  const showCost = ["COORDENADOR", "GERENTE", "DIRETOR"].includes(role);

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [actType, setActType] = useState("NOTA");
  const [actText, setActText] = useState("");
  const [savingAct, setSavingAct] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const reload = async () => {
    const res = await fetch(`/api/quotations/${id}`);
    if (res.ok) setQuotation(await res.json());
    setLoading(false);
  };

  useEffect(() => { reload(); }, [id]); // eslint-disable-line

  const updateStatus = async (status: string) => {
    if (status === "PERDIDA") { setShowLostModal(true); return; }
    setUpdating(true);
    await fetch(`/api/quotations/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await reload(); setUpdating(false);
  };

  const confirmLost = async () => {
    setUpdating(true);
    await fetch(`/api/quotations/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PERDIDA", lostReason }),
    });
    setShowLostModal(false); setLostReason("");
    await reload(); setUpdating(false);
  };

  const addActivity = async () => {
    if (!actText.trim() || !quotation) return;
    setSavingAct(true);
    await fetch("/api/activities", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: actType, description: actText, quotationId: id, userId: quotation.seller.id }),
    });
    setActText(""); await reload(); setSavingAct(false);
  };

  const completeFollowUp = async (fuId: string) => {
    await fetch("/api/follow-ups", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: fuId, status: "REALIZADO" }),
    });
    reload();
  };

  if (loading) return <PageSkeleton />;
  if (!quotation) return <div className="text-center py-20 text-sm text-red-500">Cotação não encontrada</div>;

  const terminal = TERMINAL[quotation.status];
  const nextActions = NEXT_ACTIONS[quotation.status] ?? [];
  const currentIdx = PIPELINE.findIndex((s) => s.key === quotation.status);
  const overdueCount = quotation.followUps.filter(
    (f) => f.status === "PENDENTE" && new Date(f.dueDate) < new Date()
  ).length;

  const whatsappLink = quotation.customer.phone
    ? `https://wa.me/55${quotation.customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Segue cotação #${quotation.number} da Mancal Matão no valor de ${formatBRL(quotation.totalPrice)}.\nPDF: ${typeof window !== "undefined" ? window.location.origin : ""}/api/quotations/${id}/pdf`
      )}`
    : null;

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 cursor-pointer text-gray-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Cotação #{quotation.number}</h1>
            <p className="text-sm text-gray-400 leading-tight">
              {quotation.customer.name} · {quotation.customer.city ? `${quotation.customer.city}, ` : ""}{quotation.customer.state}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`/api/quotations/${id}/pdf`} target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:border-gray-300 transition-colors">
            <FileDown className="w-3.5 h-3.5" /> PDF
          </a>
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Pipeline stepper / Terminal banner */}
      {!terminal ? (
        <div className="bg-white border border-gray-100 rounded-2xl px-6 py-5">
          <div className="flex items-start">
            {PIPELINE.map((step, idx) => {
              const isPast    = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPast    ? "bg-blue-600 text-white" :
                      isCurrent ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                                  "bg-gray-100 text-gray-400"
                    }`}>
                      {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span className={`text-[11px] font-medium whitespace-nowrap ${
                      isCurrent ? "text-blue-700" : idx < currentIdx ? "text-gray-500" : "text-gray-300"
                    }`}>{step.label}</span>
                  </div>
                  {idx < PIPELINE.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-5 ${idx < currentIdx ? "bg-blue-300" : "bg-gray-100"}`} />
                  )}
                </div>
              );
            })}
            {/* Terminais */}
            <div className="flex items-start ml-3 gap-4">
              <div className="w-0.5 h-7 bg-gray-100 mt-0 mb-5 self-center" />
              {["GANHA", "PERDIDA"].map((t) => (
                <div key={t} className="flex flex-col items-center gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    {t === "GANHA"
                      ? <CheckCircle className="w-3.5 h-3.5 text-gray-300" />
                      : <XCircle className="w-3.5 h-3.5 text-gray-300" />}
                  </div>
                  <span className="text-[11px] text-gray-300">{t === "GANHA" ? "Ganha" : "Perdida"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={`border rounded-2xl px-5 py-4 flex items-center gap-3 ${terminal.borderBg}`}>
          {quotation.status === "GANHA"
            ? <CheckCircle className={`w-5 h-5 ${terminal.textColor}`} />
            : <XCircle    className={`w-5 h-5 ${terminal.textColor}`} />}
          <div>
            <p className={`font-semibold text-sm ${terminal.textColor}`}>{terminal.label}</p>
            {quotation.wonAt  && <p className="text-xs text-gray-400 mt-0.5">Ganho em {new Date(quotation.wonAt).toLocaleDateString("pt-BR")}</p>}
            {quotation.lostAt && quotation.lostReason && <p className="text-xs text-gray-500 mt-0.5">Motivo: {quotation.lostReason}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Itens */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Itens · {quotation.items.length} produto{quotation.items.length !== 1 ? "s" : ""}
              </h3>
              <span className="text-xs text-gray-400">{quotation.marketType === "EXPORTACAO" ? "Exportação" : "Mercado Interno"}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50/70">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Código</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400">Produto</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Qtd</th>
                  {showCost && <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-400">Margem</th>}
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400">Unitário</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quotation.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-700">{item.product.code}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 max-w-[200px] truncate">{item.product.description ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">{item.quantity}</td>
                    {showCost && <td className="px-4 py-3 text-center text-sm text-gray-500">{item.margin.toFixed(0)}%</td>}
                    <td className="px-5 py-3 text-right text-sm text-gray-600">{formatBRL(item.unitPrice)}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">{formatBRL(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-100">
                  <td colSpan={showCost ? 4 : 3} className="px-5 py-3 text-right text-xs text-gray-400">
                    {showCost && `Margem média ${quotation.marginAvg.toFixed(1)}%`}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-gray-400">Total</td>
                  <td className="px-5 py-3 text-right text-lg font-bold text-gray-900">{formatBRL(quotation.totalPrice)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notas */}
          {quotation.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-2">Observações</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotation.notes}</p>
            </div>
          )}

          {/* Registrar atividade */}
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3">Registrar atividade</p>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {ACT_TYPES.map((t) => (
                <button key={t.value} onClick={() => setActType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                    actType === t.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  <t.icon className="w-3 h-3" />{t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={actText} onChange={(e) => setActText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addActivity()}
                placeholder="Descreva o que aconteceu…"
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all" />
              <button onClick={addActivity} disabled={!actText.trim() || savingAct}
                className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 cursor-pointer disabled:opacity-40 transition-colors">
                {savingAct ? <RotateCw className="w-4 h-4 animate-spin" /> : "Registrar"}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-4">
              Histórico · {quotation.activities.length} registro{quotation.activities.length !== 1 ? "s" : ""}
            </p>
            {quotation.activities.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhuma atividade registrada ainda</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />
                <div className="space-y-5">
                  {quotation.activities.map((a) => {
                    const t = ACT_TYPES.find((x) => x.value === a.type);
                    const Icon = t?.icon ?? Plus;
                    return (
                      <div key={a.id} className="flex gap-4 relative">
                        <div className="w-7 h-7 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 z-10">
                          <Icon className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{t?.label ?? a.type}</span>
                            <span className="text-xs text-gray-400">{a.user.name} · {relativeTime(a.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">{a.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">

          {/* Ações de status */}
          {nextActions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3">Atualizar status</p>
              <div className="space-y-2">
                {nextActions.map((action) => (
                  <button key={action.key} onClick={() => updateStatus(action.key)} disabled={updating}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 transition-all ${
                      action.variant === "success" ? "bg-green-600 text-white hover:bg-green-700" :
                      action.variant === "danger"  ? "bg-white border border-red-200 text-red-600 hover:bg-red-50" :
                      action.variant === "primary" ? "bg-blue-600 text-white hover:bg-blue-700" :
                                                     "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}>
                    {updating ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> :
                     action.variant === "success" ? <CheckCircle className="w-3.5 h-3.5" /> :
                     action.variant === "danger"  ? <XCircle className="w-3.5 h-3.5" /> : null}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cliente */}
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3">Cliente</p>
            <p className="font-semibold text-gray-900 text-sm leading-tight">{quotation.customer.name}</p>
            {quotation.customer.cnpj && <p className="text-xs text-gray-400 mt-0.5">{quotation.customer.cnpj}</p>}
            <p className="text-xs text-gray-400 mt-0.5">
              {quotation.customer.city ? `${quotation.customer.city} · ` : ""}{quotation.customer.state}
            </p>
            <div className="mt-3 space-y-1.5">
              {quotation.customer.phone && (
                <a href={`https://wa.me/55${quotation.customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-green-600 hover:text-green-700 font-medium">
                  <MessageSquare className="w-3.5 h-3.5" />{quotation.customer.phone}
                </a>
              )}
              {quotation.customer.email && (
                <a href={`mailto:${quotation.customer.email}`}
                  className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Mail className="w-3.5 h-3.5" />{quotation.customer.email}
                </a>
              )}
            </div>
          </div>

          {/* Follow-ups */}
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Follow-ups</p>
              {overdueCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  {overdueCount} atrasado{overdueCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {quotation.followUps.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center">Criados automaticamente ao enviar</p>
            ) : (
              <div className="space-y-2">
                {quotation.followUps.map((fu) => {
                  const overdue = fu.status === "PENDENTE" && new Date(fu.dueDate) < new Date();
                  const badgeKey = overdue ? "ATRASADO" : fu.status;
                  return (
                    <div key={fu.id} className={`flex items-center justify-between px-3 py-2 rounded-xl ${overdue ? "bg-red-50" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2">
                        {fu.status === "REALIZADO" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          : overdue ? <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          : <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        <span className="text-xs text-gray-700">
                          {new Date(fu.dueDate).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${FU_BADGE[badgeKey] ?? "text-gray-400 bg-gray-100"}`}>
                          {FU_LABEL[badgeKey] ?? fu.status}
                        </span>
                      </div>
                      {fu.status === "PENDENTE" && (
                        <button onClick={() => completeFollowUp(fu.id)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
                          Concluir
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Datas */}
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3">Datas</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Criada</span>
                <span className="text-gray-700 font-medium">{new Date(quotation.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
              {quotation.sentAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Enviada</span>
                  <span className="text-gray-700 font-medium">{new Date(quotation.sentAt).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
              {quotation.validUntil && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Válida até</span>
                  <span className="text-gray-700 font-medium">{new Date(quotation.validUntil).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
              {quotation.wonAt && (
                <div className="flex justify-between">
                  <span className="text-green-600">Ganha em</span>
                  <span className="text-green-700 font-semibold">{new Date(quotation.wonAt).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
              {quotation.lostAt && (
                <div className="flex justify-between">
                  <span className="text-red-500">Perdida em</span>
                  <span className="text-red-600 font-semibold">{new Date(quotation.lostAt).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: motivo da perda */}
      {showLostModal && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Marcar como perdida</h2>
            <p className="text-sm text-gray-500">Informe o motivo pelo qual esta cotação não foi convertida.</p>
            <textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)}
              placeholder="Ex: Preço acima do mercado, concorrente mais rápido…"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200"
              rows={3} autoFocus />
            <div className="flex gap-3">
              <button onClick={() => { setShowLostModal(false); setLostReason(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
                Cancelar
              </button>
              <button onClick={confirmLost} disabled={!lostReason.trim() || updating}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-50">
                {updating ? "Salvando…" : "Confirmar perda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
