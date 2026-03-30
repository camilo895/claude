"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  RotateCw,
  X,
  Percent,
  Search,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatBRL } from "@/lib/pricing";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  code: string;
  description: string | null;
  brand: string | null;
  costPrice: number;
  marginDefault: number;
  taxSP: number;
  stockQuantity: number;
  active: boolean;
}

interface SheetPreview {
  name: string;
  columns: string[];
  rowCount: number;
  preview: Record<string, unknown>[];
}

interface UploadResult {
  success: boolean;
  summary: {
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
  columns: { original: string; mapped: string }[];
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function GestaoTabelaPage() {
  const [tab, setTab] = useState<"margem" | "produtos" | "importar">("margem");

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
            Gestão de Preços
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure margens, edite produtos e importe novas tabelas
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200/60 p-1 rounded-xl w-fit">
          {[
            { key: "margem", label: "Margem Vigente" },
            { key: "produtos", label: "Produtos" },
            { key: "importar", label: "Importar Planilha" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "margem" && <MargemVigente />}
        {tab === "produtos" && <ListaProdutos />}
        {tab === "importar" && <ImportarPlanilha />}
      </div>
    </div>
  );
}

// ── Seção: Margem Vigente ─────────────────────────────────────────────────────
function MargemVigente() {
  const [currentMargin, setCurrentMargin] = useState<number | null>(null);
  const [newMargin, setNewMargin] = useState("");
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/products/margin")
      .then((r) => r.json())
      .then((d) => {
        setCurrentMargin(d.margin);
        setNewMargin(String(d.margin));
        setTotal(d.total ?? 0);
      })
      .catch(() => {});
  }, []);

  async function apply() {
    const m = parseFloat(newMargin);
    if (isNaN(m)) return;
    setSaving(true);
    setDone(false);
    try {
      const res = await fetch("/api/products/margin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ margin: m }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentMargin(m);
        setTotal(data.updated);
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Card principal */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Percent className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              Margem Padrão Global
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Define a margem aplicada a todos os produtos na consulta de preços.
              Pode ser ajustada individualmente por produto na aba{" "}
              <button
                className="text-blue-600 underline cursor-pointer"
                onClick={() => {
                  /* handled by parent */
                }}
              >
                Produtos
              </button>
              .
            </p>

            <div className="mt-5 flex items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Margem vigente (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newMargin}
                    onChange={(e) => setNewMargin(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && apply()}
                    min={0}
                    max={100}
                    step={0.5}
                    className="w-32 px-4 py-3 text-2xl font-semibold text-center border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <span className="text-2xl font-semibold text-gray-400">%</span>
                </div>
              </div>

              <button
                onClick={apply}
                disabled={saving}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  done
                    ? "bg-green-600 text-white"
                    : "bg-gray-900 text-white hover:bg-gray-700"
                } disabled:opacity-50`}
              >
                {saving ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : done ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {done ? "Aplicado!" : "Aplicar a todos os produtos"}
              </button>
            </div>

            {currentMargin !== null && (
              <p className="text-xs text-gray-400 mt-3">
                Margem atual: <strong className="text-gray-600">{currentMargin}%</strong>
                {total > 0 && ` — ${total} produtos ativos`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          Ao aplicar, <strong>todos os produtos ativos</strong> terão sua margem
          padrão atualizada. O preço exibido para o vendedor será recalculado na
          próxima consulta.
        </p>
      </div>
    </div>
  );
}

// ── Seção: Lista de Produtos ──────────────────────────────────────────────────
function ListaProdutos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: q, page: String(p), limit: "20" });
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load(search, 1);
    }, 300);
    return () => clearTimeout(t);
  }, [search, load]);

  useEffect(() => {
    load(search, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function saveMargin(id: string) {
    const m = editing[id];
    if (m === undefined) return;
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marginDefault: m }),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, marginDefault: m } : p))
      );
      setSaved((s) => ({ ...s, [id]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [id]: false })), 2000);
      setEditing((e) => {
        const next = { ...e };
        delete next[id];
        return next;
      });
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar por código, marca ou descrição…"
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none"
        />
        {loading && (
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100">
            <tr className="bg-gray-50/70">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                Código
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                Descrição
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                Marca
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                Custo
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                Margem %
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                Estoque
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                  {loading ? "Carregando…" : "Nenhum produto encontrado"}
                </td>
              </tr>
            )}
            {products.map((product) => {
              const marginVal = editing[product.id] ?? product.marginDefault;
              const isDirty = editing[product.id] !== undefined;
              const isSaving = saving[product.id];
              const isSaved = saved[product.id];
              return (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-sm">
                    {product.code}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[220px] truncate">
                    {product.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-blue-600 font-medium text-xs">
                    {product.brand ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 font-mono text-xs">
                    {formatBRL(product.costPrice)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        type="number"
                        value={marginVal}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            [product.id]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && saveMargin(product.id)}
                        min={0}
                        max={100}
                        step={0.5}
                        className={`w-16 px-2 py-1.5 text-center text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          isDirty
                            ? "border-blue-400 bg-blue-50 focus:ring-blue-200"
                            : "border-gray-200 focus:ring-gray-200"
                        }`}
                      />
                      <span className="text-gray-400 text-xs">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.stockQuantity > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {product.stockQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isDirty && (
                      <button
                        onClick={() => saveMargin(product.id)}
                        disabled={isSaving}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                        title="Salvar margem"
                      >
                        {isSaving ? (
                          <RotateCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {isSaved && !isDirty && (
                      <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">
              {total} produtos · página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Seção: Importar Planilha ──────────────────────────────────────────────────
function ImportarPlanilha() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetPreview[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [step, setStep] = useState<"select" | "preview" | "importing" | "done">("select");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/products/upload/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao processar arquivo"); return; }
      setSheets(data.sheets);
      if (data.sheets.length > 0) setSelectedSheet(data.sheets[0].name);
      setStep("preview");
    } catch { setError("Erro ao enviar arquivo"); }
    finally { setLoading(false); }
  };

  const handleImport = async () => {
    if (!file) return;
    setStep("importing");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sheetName", selectedSheet);
      const res = await fetch("/api/products/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro na importação"); setStep("preview"); return; }
      setResult(data);
      setStep("done");
    } catch { setError("Erro na importação"); setStep("preview"); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setFile(null); setSheets([]); setSelectedSheet("");
    setStep("select"); setResult(null); setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentSheet = sheets.find((s) => s.name === selectedSheet);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {step !== "select" && (
        <div className="flex justify-end">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" /> Novo upload
          </button>
        </div>
      )}

      {/* Step 1 */}
      {step === "select" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FileSpreadsheet className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Importar tabela de preços
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Aceita <strong>.xlsx</strong>, <strong>.xls</strong> ou <strong>.csv</strong>.
            Precisa ter pelo menos as colunas <strong>Código</strong> e <strong>Custo</strong>.
          </p>
          <label className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors cursor-pointer font-medium text-sm">
            <Upload className="w-4 h-4" />
            {loading ? "Processando…" : "Selecionar arquivo"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />
          </label>

          <div className="mt-8 text-left max-w-md mx-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Colunas reconhecidas automaticamente
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-500">
              {[
                ["Código / Cod", "Custo / Cost"],
                ["Margem / Margin", "Descrição"],
                ["Referência / Ref", "Marca / Brand"],
                ["SP (fator tributário)", "Sul/Sudeste"],
                ["N-NE-CO-ES", "Estoque / Stock"],
              ].map(([a, b], i) => (
                <div key={i} className="contents">
                  <span className="py-0.5">{a}</span>
                  <span className="py-0.5">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && currentSheet && (
        <div className="space-y-4">
          {sheets.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Selecionar aba:</p>
              <div className="flex gap-2 flex-wrap">
                {sheets.map((s) => (
                  <button key={s.name} onClick={() => setSelectedSheet(s.name)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer ${selectedSheet === s.name ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {s.name} ({s.rowCount} linhas)
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">{file?.name}</p>
              <p className="text-sm text-gray-500">
                {selectedSheet} · {currentSheet.rowCount} linhas · {currentSheet.columns.length} colunas
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="font-medium text-gray-900 text-sm">Prévia (5 primeiras linhas)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {currentSheet.columns.map((col) => (
                      <th key={col} className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentSheet.preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {currentSheet.columns.map((col) => (
                        <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(row[col] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={handleImport}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 cursor-pointer">
              <ArrowRight className="w-4 h-4" />
              Importar {currentSheet.rowCount} produtos
            </button>
            <p className="text-sm text-gray-400">Produtos com o mesmo código serão atualizados.</p>
          </div>
        </div>
      )}

      {/* Step 3: Importando */}
      {step === "importing" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
          <RotateCw className="w-10 h-10 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="font-semibold text-gray-900">Importando produtos…</p>
          <p className="text-sm text-gray-400 mt-1">Aguarde, isso pode levar alguns segundos.</p>
        </div>
      )}

      {/* Step 4: Resultado */}
      {step === "done" && result && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <CheckCircle className="w-7 h-7 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Importação concluída!</h2>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total", value: result.summary.totalRows, color: "gray" },
                { label: "Novos", value: result.summary.created, color: "green" },
                { label: "Atualizados", value: result.summary.updated, color: "blue" },
                { label: "Ignorados", value: result.summary.skipped, color: "amber" },
              ].map((s) => (
                <div key={s.label} className={`text-center p-4 bg-${s.color}-50 rounded-xl`}>
                  <p className={`text-2xl font-bold text-${s.color}-${s.color === "gray" ? "700" : "600"}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {result.summary.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-semibold text-amber-700 text-sm mb-2">
                Avisos ({result.summary.errors.length})
              </p>
              <ul className="text-xs text-amber-600 space-y-1">
                {result.summary.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <a href="/precos" className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700">
              Ir para Consulta de Preços
            </a>
            <button onClick={reset} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm cursor-pointer hover:bg-gray-50">
              Importar outro arquivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
