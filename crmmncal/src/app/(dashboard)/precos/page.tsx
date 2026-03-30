"use client";

import { useState, useCallback } from "react";
import { Search, Plus, ShoppingCart } from "lucide-react";
import { formatBRL, calculatePrice } from "@/lib/pricing";
import { getRegionByState, getRegionLabel, BRAZILIAN_STATES, type TaxRegion } from "@/lib/regions";

interface Product {
  id: string;
  code: string;
  description: string | null;
  reference: string | null;
  model: string | null;
  weight: number | null;
  brand: string | null;
  costPrice: number;
  marginDefault: number;
  taxSP: number;
  taxSulSudeste: number;
  taxNNECOES: number;
  stockQuantity: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  margin: number;
  region: TaxRegion;
  unitPrice: number;
}

export default function PrecosPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState("SP");
  const [marketType, setMarketType] = useState<"INTERNO" | "EXPORTACAO">("INTERNO");
  const [conversionFactor, setConversionFactor] = useState(100);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customMargins, setCustomMargins] = useState<Record<string, number>>({});

  const region = getRegionByState(state);

  const searchProducts = useCallback(async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setProducts(data.products);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [search]);

  const getPrice = (product: Product) => {
    const margin = customMargins[product.id] ?? product.marginDefault;
    return calculatePrice(
      {
        costPrice: product.costPrice,
        margin,
        taxSP: product.taxSP,
        taxSulSudeste: product.taxSulSudeste,
        taxNNECOES: product.taxNNECOES,
        conversionFactor: marketType === "EXPORTACAO" ? conversionFactor : 100,
      },
      region
    );
  };

  const addToCart = (product: Product) => {
    const margin = customMargins[product.id] ?? product.marginDefault;
    const price = getPrice(product);
    setCart((prev) => {
      const existing = prev.findIndex((i) => i.product.id === product.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        { product, quantity: 1, margin, region, unitPrice: price.unitPrice },
      ];
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tabela de Preços</h1>
        {cart.length > 0 && (
          <a
            href={`/cotacoes/nova?items=${encodeURIComponent(JSON.stringify(cart.map((i) => ({ productId: i.product.id, quantity: i.quantity, margin: i.margin }))))}&state=${state}&marketType=${marketType}`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Gerar Cotação ({cart.length} itens — {formatBRL(cartTotal)})
          </a>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Busca */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar produto
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchProducts()}
                placeholder="Código, descrição ou referência..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={searchProducts}
                disabled={loading}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado do cliente
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {BRAZILIAN_STATES.map((s) => (
                <option key={s.uf} value={s.uf}>
                  {s.uf} — {s.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500 mt-1 block">
              Região: {getRegionLabel(region)}
            </span>
          </div>

          {/* Mercado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mercado
            </label>
            <select
              value={marketType}
              onChange={(e) => setMarketType(e.target.value as "INTERNO" | "EXPORTACAO")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="INTERNO">Mercado Interno</option>
              <option value="EXPORTACAO">Exportação</option>
            </select>
            {marketType === "EXPORTACAO" && (
              <input
                type="number"
                value={conversionFactor}
                onChange={(e) => setConversionFactor(parseFloat(e.target.value) || 100)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Fator conversão %"
              />
            )}
          </div>
        </div>
      </div>

      {/* Tabela de resultados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descrição</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Marca</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Custo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Margem %</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Preço Final</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Margem R$</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estoque</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    {loading
                      ? "Buscando..."
                      : "Pesquise um produto pelo código, descrição ou referência"}
                  </td>
                </tr>
              )}
              {products.map((product) => {
                const margin = customMargins[product.id] ?? product.marginDefault;
                const price = getPrice(product);
                const isMinMargin = margin <= 5;

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">
                      {product.code}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {product.description ?? "—"}
                      {product.reference && (
                        <span className="block text-xs text-gray-400">
                          Ref: {product.reference}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.brand ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {formatBRL(product.costPrice)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        value={margin}
                        onChange={(e) =>
                          setCustomMargins((prev) => ({
                            ...prev,
                            [product.id]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className={`w-20 px-2 py-1 text-center border rounded-md text-sm ${
                          isMinMargin
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-gray-300"
                        }`}
                        min={0}
                        step={1}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatBRL(price.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {formatBRL(price.marginAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.stockQuantity > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {product.stockQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => addToCart(product)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Adicionar à cotação"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mini carrinho */}
      {cart.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">
            Itens para cotação ({cart.length})
          </h3>
          <div className="space-y-2">
            {cart.map((item, idx) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-mono text-gray-700">
                  {item.product.code}
                </span>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      setCart((prev) => {
                        const updated = [...prev];
                        updated[idx].quantity = parseInt(e.target.value) || 1;
                        return updated;
                      })
                    }
                    className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md"
                    min={1}
                  />
                  <span className="text-gray-600 w-24 text-right">
                    {formatBRL(item.unitPrice * item.quantity)}
                  </span>
                  <button
                    onClick={() =>
                      setCart((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-red-500 hover:text-red-700 text-xs cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatBRL(cartTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
