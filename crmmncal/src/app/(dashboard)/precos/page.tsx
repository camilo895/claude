"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  X,
  ShoppingBag,
  Plus,
  Minus,
  ChevronDown,
  Percent,
  AlertTriangle,
  SlidersHorizontal,
} from "lucide-react";
import { formatBRL, calculatePrice } from "@/lib/pricing";
import {
  getRegionByState,
  getRegionLabel,
  BRAZILIAN_STATES,
  type TaxRegion,
} from "@/lib/regions";

// ── Alçada de desconto por papel ──────────────────────────────────────────────
const DISCOUNT_LIMIT: Record<string, number> = {
  VENDEDOR: 5,
  COORDENADOR: 10,
  GERENTE: 20,
  DIRETOR: 100,
};

function canSeeCost(role: string) {
  return ["COORDENADOR", "GERENTE", "DIRETOR"].includes(role);
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  code: string;
  description: string | null;
  reference: string | null;
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
  discount: number; // % de desconto sobre o preço final
  region: TaxRegion;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PrecosPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "VENDEDOR";
  const discountLimit = DISCOUNT_LIMIT[role] ?? 5;
  const showCost = canSeeCost(role);

  // Filtros
  const [state, setState] = useState("SP");
  const [brand, setBrand] = useState<string>("");
  const [brands, setBrands] = useState<string[]>([]);
  const [marketType, setMarketType] = useState<"INTERNO" | "EXPORTACAO">("INTERNO");
  const [conversionFactor, setConversionFactor] = useState(100);
  const [showFilters, setShowFilters] = useState(false);

  // Search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cart (margem sempre vem do banco — marginDefault gerenciado pela gestão)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const region = getRegionByState(state);

  // Carrega marcas
  useEffect(() => {
    fetch("/api/products/brands")
      .then((r) => r.json())
      .then(setBrands)
      .catch(() => {});
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Busca com debounce
  const search = useCallback(
    async (q: string, b: string) => {
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }
      setSearching(true);
      try {
        const params = new URLSearchParams({ search: q, limit: "12" });
        if (b) params.set("brand", b);
        const res = await fetch(`/api/products?${params}`);
        const data = await res.json();
        setResults(data.products ?? []);
        setOpen(true);
      } catch {
        /* silently fail */
      } finally {
        setSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    const t = setTimeout(() => search(query, brand), 280);
    return () => clearTimeout(t);
  }, [query, brand, search]);

  // Preço calculado — usa sempre marginDefault do produto (definida pela gestão)
  function unitPrice(product: Product, discount: number) {
    const base = calculatePrice(
      {
        costPrice: product.costPrice,
        margin: product.marginDefault,
        taxSP: product.taxSP,
        taxSulSudeste: product.taxSulSudeste,
        taxNNECOES: product.taxNNECOES,
        conversionFactor: marketType === "EXPORTACAO" ? conversionFactor : 100,
      },
      region
    );
    return {
      ...base,
      finalPrice: base.unitPrice * (1 - discount / 100),
    };
  }

  // Adiciona ao carrinho
  function addToCart(product: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          discount: 0,
          region,
        },
      ];
    });
    setCartOpen(true);
    setOpen(false);
    setQuery("");
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== id));
  }

  function updateCart(id: string, field: "quantity" | "discount", value: number) {
    setCart((prev) =>
      prev.map((i) => (i.product.id === id ? { ...i, [field]: value } : i))
    );
  }

  const cartTotal = cart.reduce((sum, item) => {
    const p = unitPrice(item.product, item.discount);
    return sum + p.finalPrice * item.quantity;
  }, 0);

  const cartUrl = `/cotacoes/nova?items=${encodeURIComponent(
    JSON.stringify(
      cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        margin: i.product.marginDefault,
        discount: i.discount,
      }))
    )
  )}&state=${state}&marketType=${marketType}`;

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">

        {/* Cabeçalho */}
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
            Tabela de Preços
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Consulte preços por produto, fabricante ou código de referência
          </p>
        </div>

        {/* Barra de busca */}
        <div ref={searchRef} className="relative">
          <div
            className={`flex items-center gap-3 bg-white rounded-2xl shadow-sm border transition-all duration-150 px-4 py-3 ${
              open ? "border-blue-400 shadow-md ring-2 ring-blue-100" : "border-gray-200"
            }`}
          >
            {searching ? (
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="Código, descrição, referência ou fabricante…"
              className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                  inputRef.current?.focus();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdown de resultados */}
          {open && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
              <ul className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
                {results.map((product) => {
                  const p = unitPrice(product, 0);
                  const inCart = cart.some((i) => i.product.id === product.id);
                  return (
                    <li key={product.id}>
                      <button
                        onClick={() => addToCart(product)}
                        className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        {/* Código + Marca */}
                        <div className="flex flex-col min-w-[90px]">
                          <span className="font-mono text-sm font-semibold text-gray-900 leading-tight">
                            {product.code}
                          </span>
                          {product.brand && (
                            <span className="text-xs text-blue-600 font-medium">
                              {product.brand}
                            </span>
                          )}
                        </div>

                        {/* Descrição */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-700 truncate block">
                            {product.description ?? "—"}
                          </span>
                          {product.reference && (
                            <span className="text-xs text-gray-400">
                              Ref: {product.reference}
                            </span>
                          )}
                        </div>

                        {/* Preço + estoque */}
                        <div className="text-right shrink-0">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatBRL(p.unitPrice)}
                          </span>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                product.stockQuantity > 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {product.stockQuantity > 0
                                ? `${product.stockQuantity} un.`
                                : "Sem estoque"}
                            </span>
                          </div>
                        </div>

                        {/* Indicador já no carrinho */}
                        {inCart && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400 text-center">
                  {results.length} produto{results.length !== 1 ? "s" : ""} encontrado
                  {results.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          {open && results.length === 0 && query.trim() && !searching && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-8 text-center z-50">
              <p className="text-sm text-gray-500">
                Nenhum produto encontrado para <strong>"{query}"</strong>
              </p>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Estado */}
          <div className="relative">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
            >
              {BRAZILIAN_STATES.map((s) => (
                <option key={s.uf} value={s.uf}>
                  {s.uf} — {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Região calculada */}
          <span className="px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-xl font-medium">
            {getRegionLabel(region)}
          </span>

          {/* Marca */}
          {brands.length > 0 && (
            <div className="relative">
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
              >
                <option value="">Todas as marcas</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Mais opções */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors cursor-pointer ${
              showFilters
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Mais opções
          </button>
        </div>

        {/* Painel de filtros extras */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Mercado
              </label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                {(["INTERNO", "EXPORTACAO"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarketType(m)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      marketType === m
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {m === "INTERNO" ? "Interno" : "Exportação"}
                  </button>
                ))}
              </div>
            </div>
            {marketType === "EXPORTACAO" && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Fator de conversão (%)
                </label>
                <input
                  type="number"
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(parseFloat(e.target.value) || 100)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            )}
          </div>
        )}

        {/* Estado vazio — instrução */}
        {cart.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">
              Digite no campo acima para buscar um produto
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Filtre por estado para calcular o imposto correto
            </p>
          </div>
        )}

        {/* Carrinho / Itens selecionados */}
        {cart.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header do carrinho */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-gray-700" />
                <span className="font-semibold text-gray-900">
                  Itens para cotação
                </span>
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {cart.length}
                </span>
              </div>
              <button
                onClick={() => setCartOpen((v) => !v)}
                className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                {cartOpen ? "Recolher" : "Expandir"}
              </button>
            </div>

            {cartOpen && (
              <>
                {/* Lista de itens */}
                <div className="divide-y divide-gray-50">
                  {cart.map((item) => {
                    const p = unitPrice(item.product, item.discount);
                    const discountExceeded = item.discount > discountLimit;
                    return (
                      <div key={item.product.id} className="px-5 py-4">
                        {/* Linha 1: código + descrição + remover */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <span className="font-mono font-semibold text-gray-900 text-sm">
                              {item.product.code}
                            </span>
                            {item.product.brand && (
                              <span className="ml-2 text-xs text-blue-600 font-medium">
                                {item.product.brand}
                              </span>
                            )}
                            {item.product.description && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {item.product.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Linha 2: controles */}
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Quantidade */}
                          <div className="flex items-center gap-1 bg-gray-100 rounded-xl px-1 py-1">
                            <button
                              onClick={() =>
                                updateCart(
                                  item.product.id,
                                  "quantity",
                                  Math.max(1, item.quantity - 1)
                                )
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                            >
                              <Minus className="w-3 h-3 text-gray-600" />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateCart(item.product.id, "quantity", item.quantity + 1)
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-gray-600" />
                            </button>
                          </div>

                          {/* Desconto */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400">Desconto</span>
                            <div className="relative">
                              <input
                                type="number"
                                value={item.discount}
                                onChange={(e) =>
                                  updateCart(
                                    item.product.id,
                                    "discount",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className={`w-16 px-2 py-1.5 text-center text-sm border rounded-xl focus:outline-none focus:ring-2 ${
                                  discountExceeded
                                    ? "border-amber-400 bg-amber-50 text-amber-700 focus:ring-amber-200"
                                    : "border-gray-200 focus:ring-blue-200"
                                }`}
                                min={0}
                                max={100}
                                step={0.5}
                              />
                            </div>
                            <span className="text-xs text-gray-400">%</span>
                            {discountExceeded && (
                              <span
                                title={`Sua alçada máxima é ${discountLimit}%. Precisa de aprovação.`}
                                className="flex items-center gap-1 text-xs text-amber-600 font-medium cursor-help"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Aprovação
                              </span>
                            )}
                          </div>

                          {/* Preço unitário final */}
                          <div className="ml-auto text-right">
                            {item.discount > 0 && (
                              <span className="text-xs text-gray-400 line-through block">
                                {formatBRL(p.unitPrice)}
                              </span>
                            )}
                            <span className="text-base font-semibold text-gray-900">
                              {formatBRL(p.finalPrice)}
                            </span>
                            <span className="text-xs text-gray-400 block">
                              × {item.quantity} ={" "}
                              <strong className="text-gray-600">
                                {formatBRL(p.finalPrice * item.quantity)}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* Linha 3: info financeira — só gestores */}
                        {showCost && (
                          <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t border-gray-50">
                            <span className="text-xs text-gray-400">
                              Custo: <strong className="text-gray-600">{formatBRL(item.product.costPrice)}</strong>
                            </span>
                            <span className="text-xs text-gray-400">
                              Margem: <strong className="text-gray-600">{item.product.marginDefault}%</strong>
                            </span>
                            <span className="text-xs text-gray-400">
                              Margem R$:{" "}
                              <strong className={p.marginAmount < 0 ? "text-red-600" : "text-green-600"}>
                                {formatBRL(p.marginAmount)}
                              </strong>
                            </span>
                            <span className="text-xs text-gray-400">
                              Imposto: <strong className="text-gray-600">{p.taxRate.toFixed(2)}%</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer do carrinho */}
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        {cart.reduce((s, i) => s + i.quantity, 0)} unidade
                        {cart.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
                      </p>
                      {cart.some((i) => i.discount > discountLimit) && (
                        <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Itens com desconto acima da sua alçada ({discountLimit}%)
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="text-2xl font-semibold text-gray-900 tracking-tight">
                        {formatBRL(cartTotal)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setCart([])}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Limpar
                    </button>
                    <a
                      href={cartUrl}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold text-center hover:bg-blue-700 transition-colors"
                    >
                      Gerar Cotação
                    </a>
                  </div>
                </div>
              </>
            )}

            {!cartOpen && (
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-gray-500">
                  {cart.length} produto{cart.length !== 1 ? "s" : ""} selecionado
                  {cart.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatBRL(cartTotal)}
                  </span>
                  <a
                    href={cartUrl}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Gerar Cotação
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
