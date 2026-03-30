"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, FileDown, Send } from "lucide-react";
import { formatBRL, calculatePrice } from "@/lib/pricing";
import {
  getRegionByState,
  BRAZILIAN_STATES,
} from "@/lib/regions";

interface Product {
  id: string;
  code: string;
  description: string | null;
  costPrice: number;
  marginDefault: number;
  taxSP: number;
  taxSulSudeste: number;
  taxNNECOES: number;
}

interface QuotationItem {
  product: Product;
  quantity: number;
  margin: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
}

export default function NovaCotacaoPage() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerState, setCustomerState] = useState("SP");
  const [customerCnpj, setCustomerCnpj] = useState("");
  const [marketType, setMarketType] = useState<"INTERNO" | "EXPORTACAO">("INTERNO");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);

  const region = getRegionByState(customerState);

  const searchProducts = async () => {
    if (!productSearch.trim()) return;
    const res = await fetch(`/api/products?search=${encodeURIComponent(productSearch)}`);
    const data = await res.json();
    setSearchResults(data.products);
  };

  const addItem = (product: Product) => {
    const price = calculatePrice(
      {
        costPrice: product.costPrice,
        margin: product.marginDefault,
        taxSP: product.taxSP,
        taxSulSudeste: product.taxSulSudeste,
        taxNNECOES: product.taxNNECOES,
      },
      region
    );

    setItems((prev) => [
      ...prev,
      {
        product,
        quantity: 1,
        margin: product.marginDefault,
        unitPrice: price.unitPrice,
        totalPrice: price.unitPrice,
        taxRate: price.taxRate,
      },
    ]);
    setSearchResults([]);
    setProductSearch("");
  };

  const updateItem = (idx: number, field: "quantity" | "margin", value: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx] };
      item[field] = value;

      const price = calculatePrice(
        {
          costPrice: item.product.costPrice,
          margin: item.margin,
          taxSP: item.product.taxSP,
          taxSulSudeste: item.product.taxSulSudeste,
          taxNNECOES: item.product.taxNNECOES,
        },
        region
      );
      item.unitPrice = price.unitPrice;
      item.totalPrice = price.unitPrice * item.quantity;
      item.taxRate = price.taxRate;

      updated[idx] = item;
      return updated;
    });
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalPrice = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const totalCost = items.reduce((sum, i) => sum + i.product.costPrice * i.quantity, 0);
  const avgMargin = totalCost > 0 ? ((totalPrice / totalCost - 1) * 100) : 0;

  const handleSave = async () => {
    if (!customerName || items.length === 0) return;
    setSaving(true);

    try {
      // Criar cliente primeiro
      const customerRes = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName,
          phone: customerPhone,
          state: customerState,
          cnpj: customerCnpj,
        }),
      });
      const customer = await customerRes.json();

      // Criar cotação
      const quotationRes = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          sellerId: "temp", // Will be replaced with session user
          marketType,
          notes,
          totalCost,
          totalPrice,
          marginAvg: avgMargin,
          items: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            unitCost: i.product.costPrice,
            margin: i.margin,
            taxRate: i.taxRate,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
        }),
      });

      if (quotationRes.ok) {
        router.push("/cotacoes");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900">Nova Cotação</h1>

      {/* Dados do cliente */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Nome da empresa"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="(16) 99999-9999"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
            <input
              type="text"
              value={customerCnpj}
              onChange={(e) => setCustomerCnpj(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
            <select
              value={customerState}
              onChange={(e) => setCustomerState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {BRAZILIAN_STATES.map((s) => (
                <option key={s.uf} value={s.uf}>
                  {s.uf} — {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={marketType === "INTERNO"}
              onChange={() => setMarketType("INTERNO")}
            />
            <span className="text-sm">Mercado Interno</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={marketType === "EXPORTACAO"}
              onChange={() => setMarketType("EXPORTACAO")}
            />
            <span className="text-sm">Exportação</span>
          </label>
        </div>
      </div>

      {/* Adicionar itens */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Itens da Cotação</h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchProducts()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar produto por código ou descrição..."
          />
          <button
            onClick={searchProducts}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mb-4 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => addItem(p)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-sm text-left cursor-pointer"
              >
                <span className="font-mono font-medium">{p.code}</span>
                <span className="text-gray-500">{p.description}</span>
                <span className="text-gray-700">{formatBRL(p.costPrice)}</span>
                <Plus className="w-4 h-4 text-blue-600" />
              </button>
            ))}
          </div>
        )}

        {/* Tabela de itens */}
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Código</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600">Qtd</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600">Margem %</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Preço Unit.</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Total</th>
              <th className="text-center px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Adicione produtos à cotação
                </td>
              </tr>
            )}
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2 font-mono">{item.product.code}</td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1 text-center border border-gray-300 rounded"
                    min={1}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="number"
                    value={item.margin}
                    onChange={(e) => updateItem(idx, "margin", parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-center border border-gray-300 rounded"
                    min={0}
                    step={1}
                  />
                </td>
                <td className="px-3 py-2 text-right">{formatBRL(item.unitPrice)}</td>
                <td className="px-3 py-2 text-right font-semibold">{formatBRL(item.totalPrice)}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {items.length > 0 && (
            <tfoot className="border-t-2 border-gray-200">
              <tr>
                <td colSpan={3} className="px-3 py-3 text-right font-semibold">Total:</td>
                <td className="px-3 py-3 text-right text-gray-500">
                  Margem média: {avgMargin.toFixed(1)}%
                </td>
                <td className="px-3 py-3 text-right text-lg font-bold text-gray-900">
                  {formatBRL(totalPrice)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Observações e ações */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Condições de pagamento, prazo de entrega..."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!customerName || items.length === 0 || saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar Cotação"}
        </button>
        {customerPhone && (
          <button
            onClick={handleSave}
            disabled={!customerName || items.length === 0 || saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Salvar e Enviar WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}
