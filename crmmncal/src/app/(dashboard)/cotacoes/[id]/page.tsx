"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileDown,
  Send,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { formatBRL } from "@/lib/pricing";

interface Quotation {
  id: string;
  number: number;
  status: string;
  marketType: string;
  totalPrice: number;
  totalCost: number;
  marginAvg: number;
  notes: string | null;
  validUntil: string | null;
  createdAt: string;
  sentAt: string | null;
  wonAt: string | null;
  lostAt: string | null;
  lostReason: string | null;
  customer: {
    id: string;
    name: string;
    cnpj: string | null;
    phone: string | null;
    email: string | null;
    state: string;
    city: string | null;
  };
  seller: { id: string; name: string; email: string | null };
  items: Array<{
    id: string;
    quantity: number;
    unitCost: number;
    margin: number;
    unitPrice: number;
    totalPrice: number;
    product: { code: string; description: string | null };
  }>;
  followUps: Array<{
    id: string;
    dueDate: string;
    status: string;
    notes: string | null;
    completedAt: string | null;
  }>;
  activities: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    user: { name: string };
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string[] }> = {
  RASCUNHO: { label: "Rascunho", color: "bg-gray-100 text-gray-600", next: ["ENVIADA"] },
  ENVIADA: { label: "Enviada", color: "bg-blue-100 text-blue-700", next: ["EM_FOLLOWUP", "EM_NEGOCIACAO", "GANHA", "PERDIDA"] },
  EM_FOLLOWUP: { label: "Em Follow-up", color: "bg-yellow-100 text-yellow-700", next: ["EM_NEGOCIACAO", "GANHA", "PERDIDA"] },
  EM_NEGOCIACAO: { label: "Em Negociação", color: "bg-purple-100 text-purple-700", next: ["GANHA", "PERDIDA"] },
  GANHA: { label: "Ganha", color: "bg-green-100 text-green-700", next: [] },
  PERDIDA: { label: "Perdida", color: "bg-red-100 text-red-700", next: [] },
};

const ACTIVITY_TYPES = [
  { value: "LIGACAO", label: "Ligação", icon: Phone },
  { value: "EMAIL", label: "E-mail", icon: Mail },
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageSquare },
  { value: "REUNIAO", label: "Reunião", icon: Calendar },
  { value: "NOTA", label: "Nota", icon: Plus },
];

const FOLLOWUP_STATUS: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: "Pendente", color: "text-yellow-600" },
  REALIZADO: { label: "Realizado", color: "text-green-600" },
  ATRASADO: { label: "Atrasado", color: "text-red-600" },
  CANCELADO: { label: "Cancelado", color: "text-gray-400" },
};

export default function CotacaoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [newActivity, setNewActivity] = useState({ type: "NOTA", description: "" });
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const fetchQuotation = async () => {
    const res = await fetch(`/api/quotations/${id}`);
    if (res.ok) {
      setQuotation(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const updateStatus = async (status: string) => {
    if (status === "PERDIDA") {
      setShowLostModal(true);
      return;
    }

    await fetch(`/api/quotations/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchQuotation();
  };

  const confirmLost = async () => {
    await fetch(`/api/quotations/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PERDIDA", lostReason }),
    });
    setShowLostModal(false);
    setLostReason("");
    fetchQuotation();
  };

  const addActivity = async () => {
    if (!newActivity.description.trim() || !quotation) return;

    await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newActivity,
        quotationId: id,
        userId: quotation.seller.id,
      }),
    });
    setNewActivity({ type: "NOTA", description: "" });
    fetchQuotation();
  };

  const completeFollowUp = async (followUpId: string, notes: string) => {
    await fetch("/api/follow-ups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: followUpId, status: "REALIZADO", notes }),
    });
    fetchQuotation();
  };

  const whatsappLink = quotation?.customer.phone
    ? `https://wa.me/55${quotation.customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Segue cotação #${quotation.number} da Mancal Matão no valor de ${formatBRL(quotation.totalPrice)}.\n\nPDF: ${typeof window !== "undefined" ? window.location.origin : ""}/api/quotations/${id}/pdf`
      )}`
    : null;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  }

  if (!quotation) {
    return <div className="text-center py-12 text-red-500">Cotação não encontrada</div>;
  }

  const statusConfig = STATUS_CONFIG[quotation.status] ?? STATUS_CONFIG.RASCUNHO;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Cotação #{quotation.number}
            </h1>
            <p className="text-gray-500">{quotation.customer.name} — {quotation.customer.state}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/quotations/${id}/pdf`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </a>
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Status actions */}
      {statusConfig.next.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-3">Atualizar status:</p>
          <div className="flex gap-2 flex-wrap">
            {statusConfig.next.map((nextStatus) => {
              const next = STATUS_CONFIG[nextStatus];
              const isWon = nextStatus === "GANHA";
              const isLost = nextStatus === "PERDIDA";
              return (
                <button
                  key={nextStatus}
                  onClick={() => updateStatus(nextStatus)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                    isWon
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : isLost
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {isWon && <CheckCircle className="w-4 h-4" />}
                  {isLost && <XCircle className="w-4 h-4" />}
                  {next.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Items + Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Itens da Cotação</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Código</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Descrição</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">Qtd</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">Margem</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Unit.</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotation.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-medium">{item.product.code}</td>
                    <td className="px-4 py-2 text-gray-600">{item.product.description ?? "—"}</td>
                    <td className="px-4 py-2 text-center">{item.quantity}</td>
                    <td className="px-4 py-2 text-center">{item.margin.toFixed(0)}%</td>
                    <td className="px-4 py-2 text-right">{formatBRL(item.unitPrice)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatBRL(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-gray-500">
                    Margem média: {quotation.marginAvg.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">Total:</td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">
                    {formatBRL(quotation.totalPrice)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Add Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Registrar Atividade</h3>
            <div className="flex gap-2 mb-3">
              {ACTIVITY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setNewActivity((prev) => ({ ...prev, type: t.value }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    newActivity.type === t.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newActivity.description}
                onChange={(e) => setNewActivity((prev) => ({ ...prev, description: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addActivity()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Descreva a atividade..."
              />
              <button
                onClick={addActivity}
                disabled={!newActivity.description.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              >
                Registrar
              </button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Histórico de Atividades</h3>
            {quotation.activities.length === 0 ? (
              <p className="text-center py-6 text-gray-400 text-sm">Nenhuma atividade registrada</p>
            ) : (
              <div className="space-y-3">
                {quotation.activities.map((activity) => {
                  const typeConfig = ACTIVITY_TYPES.find((t) => t.value === activity.type);
                  const Icon = typeConfig?.icon ?? Plus;
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="mt-1 p-1.5 bg-gray-100 rounded-lg">
                        <Icon className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {typeConfig?.label ?? activity.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {activity.user.name} — {new Date(activity.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Customer info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Cliente</h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{quotation.customer.name}</p>
              {quotation.customer.cnpj && <p className="text-gray-500">CNPJ: {quotation.customer.cnpj}</p>}
              <p className="text-gray-500">{quotation.customer.city ? `${quotation.customer.city} - ` : ""}{quotation.customer.state}</p>
              {quotation.customer.phone && (
                <a
                  href={`https://wa.me/55${quotation.customer.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-600 hover:text-green-700"
                >
                  <MessageSquare className="w-4 h-4" />
                  {quotation.customer.phone}
                </a>
              )}
              {quotation.customer.email && (
                <a href={`mailto:${quotation.customer.email}`} className="flex items-center gap-2 text-blue-600">
                  <Mail className="w-4 h-4" />
                  {quotation.customer.email}
                </a>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Datas</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Criada:</span>
                <span>{new Date(quotation.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
              {quotation.sentAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Enviada:</span>
                  <span>{new Date(quotation.sentAt).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
              {quotation.wonAt && (
                <div className="flex justify-between text-green-600">
                  <span>Ganha:</span>
                  <span>{new Date(quotation.wonAt).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
              {quotation.lostAt && (
                <div className="flex justify-between text-red-600">
                  <span>Perdida:</span>
                  <span>{new Date(quotation.lostAt).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
            </div>
            {quotation.lostReason && (
              <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-600">
                <strong>Motivo da perda:</strong> {quotation.lostReason}
              </div>
            )}
          </div>

          {/* Follow-ups */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Follow-ups</h3>
            {quotation.followUps.length === 0 ? (
              <p className="text-center py-4 text-gray-400 text-xs">
                Follow-ups serão criados ao enviar a cotação
              </p>
            ) : (
              <div className="space-y-3">
                {quotation.followUps.map((fu) => {
                  const fStatus = FOLLOWUP_STATUS[fu.status] ?? FOLLOWUP_STATUS.PENDENTE;
                  const isPast = new Date(fu.dueDate) < new Date() && fu.status === "PENDENTE";
                  return (
                    <div key={fu.id} className={`p-3 rounded-lg border ${isPast ? "border-red-200 bg-red-50" : "border-gray-200"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Clock className={`w-3.5 h-3.5 ${fStatus.color}`} />
                          <span className={`text-xs font-medium ${fStatus.color}`}>{fStatus.label}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(fu.dueDate).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {isPast && (
                        <p className="text-xs text-red-600 flex items-center gap-1 mb-1">
                          <AlertTriangle className="w-3 h-3" /> Atrasado
                        </p>
                      )}
                      {fu.status === "PENDENTE" && (
                        <button
                          onClick={() => completeFollowUp(fu.id, "Follow-up realizado")}
                          className="mt-1 text-xs text-green-600 hover:text-green-700 font-medium cursor-pointer"
                        >
                          Marcar como realizado
                        </button>
                      )}
                      {fu.notes && <p className="text-xs text-gray-500 mt-1">{fu.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          {quotation.notes && (
            <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
              <h3 className="font-semibold text-yellow-800 mb-2 text-sm">Observações</h3>
              <p className="text-sm text-yellow-700">{quotation.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lost reason modal */}
      {showLostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Motivo da Perda</h3>
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
              placeholder="Preço, prazo, concorrência..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowLostModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmLost}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
              >
                Confirmar Perda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
