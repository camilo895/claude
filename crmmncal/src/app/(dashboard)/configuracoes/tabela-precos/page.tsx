"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  RotateCw,
  X,
} from "lucide-react";

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

export default function TabelaPrecosUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetPreview[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [step, setStep] = useState<"select" | "preview" | "importing" | "done">("select");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/products/upload/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao processar arquivo");
        setLoading(false);
        return;
      }

      setSheets(data.sheets);
      if (data.sheets.length > 0) {
        setSelectedSheet(data.sheets[0].name);
      }
      setStep("preview");
    } catch {
      setError("Erro ao enviar arquivo");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setStep("importing");
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sheetName", selectedSheet);

      const res = await fetch("/api/products/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro na importação");
        setStep("preview");
        setLoading(false);
        return;
      }

      setResult(data);
      setStep("done");
    } catch {
      setError("Erro na importação");
      setStep("preview");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setSheets([]);
    setSelectedSheet("");
    setStep("select");
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentSheet = sheets.find((s) => s.name === selectedSheet);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Importar Tabela de Preços
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Faça upload da planilha Excel ou CSV com os produtos e preços
          </p>
        </div>
        {step !== "select" && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            Novo Upload
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Selecionar arquivo */}
      {step === "select" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Selecione o arquivo da tabela de preços
            </h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Aceita arquivos Excel (.xlsx, .xls) ou CSV (.csv). A planilha deve
              conter pelo menos as colunas <strong>Código</strong> e{" "}
              <strong>Custo</strong>.
            </p>

            <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
              <Upload className="w-5 h-5" />
              {loading ? "Processando..." : "Selecionar Arquivo"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                disabled={loading}
              />
            </label>

            <div className="mt-8 text-left max-w-lg mx-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Colunas reconhecidas automaticamente:
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <span>Código / Cod</span>
                <span>Custo / Cost</span>
                <span>Margem / Margin</span>
                <span>Descrição</span>
                <span>Referência / Ref</span>
                <span>Modelo</span>
                <span>Peso / Weight</span>
                <span>Marca / Brand</span>
                <span>SP (fator tributário)</span>
                <span>Sul/Sudeste (fator)</span>
                <span>N-NE-CO-ES (fator)</span>
                <span>Estoque / Stock</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && currentSheet && (
        <div className="space-y-4">
          {/* Seletor de aba */}
          {sheets.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione a aba da planilha:
              </label>
              <div className="flex gap-2 flex-wrap">
                {sheets.map((sheet) => (
                  <button
                    key={sheet.name}
                    onClick={() => setSelectedSheet(sheet.name)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      selectedSheet === sheet.name
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {sheet.name} ({sheet.rowCount} linhas)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info do arquivo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">{file?.name}</p>
                  <p className="text-sm text-gray-500">
                    Aba: {selectedSheet} — {currentSheet.rowCount} linhas —{" "}
                    {currentSheet.columns.length} colunas
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Colunas detectadas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Colunas detectadas</h3>
            <div className="flex gap-2 flex-wrap">
              {currentSheet.columns.map((col) => (
                <span
                  key={col}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Preview dos dados */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                Preview (primeiras 5 linhas)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {currentSheet.columns.map((col) => (
                      <th
                        key={col}
                        className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentSheet.preview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {currentSheet.columns.map((col) => (
                        <td
                          key={col}
                          className="px-3 py-2 text-gray-700 whitespace-nowrap"
                        >
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botão importar */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-lg font-semibold"
            >
              <ArrowRight className="w-5 h-5" />
              Importar {currentSheet.rowCount} produtos
            </button>
            <p className="text-sm text-gray-500">
              Produtos existentes com o mesmo código serão atualizados.
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Importando */}
      {step === "importing" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <RotateCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-lg font-semibold text-gray-900">Importando produtos...</h2>
          <p className="text-gray-500 mt-2">
            Processando a tabela de preços. Aguarde...
          </p>
        </div>
      )}

      {/* Step 4: Resultado */}
      {step === "done" && result && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Importação concluída!
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">
                  {result.summary.totalRows}
                </p>
                <p className="text-sm text-gray-500">Total de linhas</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {result.summary.created}
                </p>
                <p className="text-sm text-gray-500">Novos produtos</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {result.summary.updated}
                </p>
                <p className="text-sm text-gray-500">Atualizados</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {result.summary.skipped}
                </p>
                <p className="text-sm text-gray-500">Ignorados</p>
              </div>
            </div>
          </div>

          {/* Mapeamento de colunas usado */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              Mapeamento de colunas utilizado
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {result.columns.map((col) => (
                <div key={col.original} className="flex items-center gap-2">
                  <span className="text-gray-500">{col.original}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <span
                    className={`font-medium ${
                      col.mapped !== col.original
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    {col.mapped !== col.original ? col.mapped : "(não mapeado)"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Erros */}
          {result.summary.errors.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-4">
              <h3 className="font-semibold text-yellow-700 mb-2">
                Avisos ({result.summary.errors.length})
              </h3>
              <ul className="text-sm text-yellow-600 space-y-1">
                {result.summary.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <a
              href="/precos"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ver Tabela de Preços
            </a>
            <button
              onClick={reset}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Importar outro arquivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
