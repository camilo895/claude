"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Save, Users, Bell, Target, Upload, CheckCircle } from "lucide-react";

interface Team {
  id: string;
  name: string;
  manager: { name: string };
  members: Array<{ id: string; name: string; role: string }>;
  followUpConfig: {
    firstFollowUpDays: number;
    secondFollowUpDays: number;
    thirdFollowUpDays: number;
    maxFollowUps: number;
  } | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export default function ConfiguracoesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [followUpDays, setFollowUpDays] = useState({ first: 2, second: 5, third: 10 });
  const [savedFollowUp, setSavedFollowUp] = useState(false);
  const [loading, setLoading] = useState(true);

  // Meta
  const [selectedUserId, setSelectedUserId] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [conversionRate, setConversionRate] = useState("10");
  const [savedGoal, setSavedGoal] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/teams").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([teamsData, usersData]) => {
      setTeams(teamsData ?? []);
      setUsers(usersData ?? []);
      if (teamsData?.[0]?.followUpConfig) {
        const c = teamsData[0].followUpConfig;
        setFollowUpDays({
          first: c.firstFollowUpDays,
          second: c.secondFollowUpDays,
          third: c.thirdFollowUpDays,
        });
      }
      setLoading(false);
    });
  }, []);

  const saveFollowUpConfig = async () => {
    if (!teams[0]) return;
    await fetch("/api/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: teams[0].id,
        followUpConfig: {
          firstFollowUpDays: followUpDays.first,
          secondFollowUpDays: followUpDays.second,
          thirdFollowUpDays: followUpDays.third,
        },
      }),
    });
    setSavedFollowUp(true);
    setTimeout(() => setSavedFollowUp(false), 3000);
  };

  const saveGoal = async () => {
    if (!selectedUserId || !targetAmount) return;
    const now = new Date();
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUserId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        targetAmount,
        conversionRate,
      }),
    });
    setSavedGoal(true);
    setTimeout(() => setSavedGoal(false), 3000);
  };

  const updateUserRole = async (userId: string, role: string) => {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, role }),
    });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      {/* Upload tabela de preços */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900">Tabela de Preços</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Importe ou atualize a tabela de preços a partir de um arquivo Excel ou CSV.
        </p>
        <Link
          href="/configuracoes/tabela-precos"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Importar Tabela de Preços
        </Link>
      </div>

      {/* Follow-up */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-900">Parametrização de Follow-up</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Dias após envio da cotação para cada follow-up automático.
          Vendedores receberão notificação por e-mail e evento no Google Calendar.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">1o Follow-up (dias)</label>
            <input
              type="number"
              value={followUpDays.first}
              onChange={(e) => setFollowUpDays((prev) => ({ ...prev, first: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">2o Follow-up (dias)</label>
            <input
              type="number"
              value={followUpDays.second}
              onChange={(e) => setFollowUpDays((prev) => ({ ...prev, second: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">3o Follow-up (dias)</label>
            <input
              type="number"
              value={followUpDays.third}
              onChange={(e) => setFollowUpDays((prev) => ({ ...prev, third: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min={1}
            />
          </div>
        </div>
        <button
          onClick={saveFollowUpConfig}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          {savedFollowUp ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {savedFollowUp ? "Salvo!" : "Salvar Configurações"}
        </button>
      </div>

      {/* Metas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900">Metas de Venda</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Configure a meta mensal de cada vendedor. O sistema calculará automaticamente
          a meta diária de cotações.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Selecione...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Mensal (R$)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="100000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de Conversão (%)</label>
            <input
              type="number"
              value={conversionRate}
              onChange={(e) => setConversionRate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="10"
            />
          </div>
        </div>
        <button
          onClick={saveGoal}
          disabled={!selectedUserId || !targetAmount}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          {savedGoal ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {savedGoal ? "Meta Salva!" : "Definir Meta"}
        </button>
      </div>

      {/* Equipe */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900">Equipe</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Gerencie os perfis de acesso. Novos usuários são cadastrados automaticamente
          ao fazer login com Google.
        </p>
        {users.length === 0 ? (
          <p className="text-center py-6 text-gray-400 text-sm">
            Nenhum usuário cadastrado. Faça login com Google para criar o primeiro.
          </p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <select
                  value={user.role}
                  onChange={(e) => updateUserRole(user.id, e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="COORDENADOR">Coordenador</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="DIRETOR">Diretor</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
