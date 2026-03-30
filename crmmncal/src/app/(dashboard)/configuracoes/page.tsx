"use client";

import { useState } from "react";
import { Save, Users, Bell, Target } from "lucide-react";

export default function ConfiguracoesPage() {
  const [followUpDays, setFollowUpDays] = useState({
    first: 2,
    second: 5,
    third: 10,
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      {/* Follow-up */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Parametrização de Follow-up
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Defina os dias após o envio da cotação para cada follow-up automático.
          Os vendedores receberão notificação por e-mail e evento no Google Calendar.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              1o Follow-up (dias)
            </label>
            <input
              type="number"
              value={followUpDays.first}
              onChange={(e) =>
                setFollowUpDays((prev) => ({
                  ...prev,
                  first: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              2o Follow-up (dias)
            </label>
            <input
              type="number"
              value={followUpDays.second}
              onChange={(e) =>
                setFollowUpDays((prev) => ({
                  ...prev,
                  second: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              3o Follow-up (dias)
            </label>
            <input
              type="number"
              value={followUpDays.third}
              onChange={(e) =>
                setFollowUpDays((prev) => ({
                  ...prev,
                  third: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min={1}
            />
          </div>
        </div>
        <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
          <Save className="w-4 h-4" />
          Salvar Configurações
        </button>
      </div>

      {/* Metas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900">Metas de Venda</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Configure a meta mensal de cada vendedor. O sistema calculará
          automaticamente a meta diária de cotações baseada no ticket médio e
          taxa de conversão.
        </p>
        <div className="text-center py-8 text-gray-400">
          Configure as metas dos vendedores aqui (em breve)
        </div>
      </div>

      {/* Equipe */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900">Equipe</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Gerencie os vendedores da equipe e seus perfis de acesso.
        </p>
        <div className="text-center py-8 text-gray-400">
          Gerenciamento de equipe (em breve)
        </div>
      </div>
    </div>
  );
}
