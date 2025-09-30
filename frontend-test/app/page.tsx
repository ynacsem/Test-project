"use client";

import { useEffect, useState } from "react";
import {
  getAllDiagnoses,
  getDiagnosisByClient,
  createDiagnosis,
  updateDiagnosis,
  isValidUUID,
  Diagnosis,
} from "../lib/api";

const sampleClientIds = [
  "550e8400-e29b-41d4-a716-446655440001",
  "550e8400-e29b-41d4-a716-446655440002", 
  "550e8400-e29b-41d4-a716-446655440003",
  "550e8400-e29b-41d4-a716-446655440004",
  "550e8400-e29b-41d4-a716-446655440005"
];

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export default function Page() {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [clientId, setClientId] = useState("");
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<"search" | "edit" | "challenge">("search");
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({
    diagnosis_name: "",
    justification: "",
    challenged_diagnosis: "",
    challenged_justification: "",
  });

  useEffect(() => {
    handleLoadAll();
  }, []);

  const showToast = (message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  async function handleLoadAll() {
    setLoading(true);
    setLoadingState("Loading all diagnoses...");
    try {
      const data = await getAllDiagnoses();
      setDiagnoses(data);
      showToast(`Loaded ${data.length} diagnoses`, "success");
    } catch (err) {
      console.error(err);
      showToast("Error fetching diagnoses", "error");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  }

  async function handleGetByClient() {
    if (!clientId.trim()) {
      showToast("Please enter a valid Client ID", "error");
      return;
    }
    
    if (!isValidUUID(clientId)) {
      showToast("Please enter a valid UUID format", "error");
      return;
    }
    
    setLoading(true);
    setLoadingState("Fetching client diagnosis...");
    try {
      const d = await getDiagnosisByClient(clientId);
      setDiagnosis(d);
      setForm({
        diagnosis_name: d.diagnosis_name,
        justification: d.justification,
        challenged_diagnosis: d.challenged_diagnosis || "",
        challenged_justification: d.challenged_justification || "",
      });
      setActiveTab("edit");
      setShowCreateForm(false);
      showToast("Client diagnosis loaded successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Error fetching client diagnosis", "error");
      setDiagnosis(null);
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  }

  async function handleCreate() {
    if (!clientId.trim()) {
      showToast("Please enter a valid Client ID", "error");
      return;
    }
    if (!isValidUUID(clientId)) {
      showToast("Please enter a valid UUID format", "error");
      return;
    }
    if (!form.diagnosis_name.trim() || !form.justification.trim()) {
      showToast("Diagnosis_name and justification are required", "error");
      return;
    }

    setLoading(true);
    setLoadingState("Creating diagnosis...");
    try {
      const created = await createDiagnosis(clientId, {
        client_id: clientId,
        diagnosis_name: form.diagnosis_name,
        justification: form.justification,
        challenged_diagnosis: form.challenged_diagnosis || null,
        challenged_justification: form.challenged_justification || null,
      });
      setDiagnosis(created);
      setShowCreateForm(false);
      setActiveTab("edit");
      handleLoadAll();
      showToast("Diagnosis created successfully!", "success");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      showToast("Error creating diagnosis", "error");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  }

  async function handleUpdate() {
    if (!diagnosis) {
      showToast("Please load a diagnosis first", "error");
      return;
    }
    
    setLoading(true);
    setLoadingState("Updating diagnosis...");
    try {
      const updated = await updateDiagnosis(diagnosis.id, {
        diagnosis_name: form.diagnosis_name || diagnosis.diagnosis_name,
        justification: form.justification || diagnosis.justification,
        challenged_diagnosis: form.challenged_diagnosis || diagnosis.challenged_diagnosis,
        challenged_justification: form.challenged_justification || diagnosis.challenged_justification,
      });
      setDiagnosis(updated);
      handleLoadAll();
      showToast("Diagnosis updated successfully!", "success");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      showToast("Error updating diagnosis", "error");
    } finally {
      setLoading(false);
      setLoadingState("");
    }
  }

  const resetForm = () => {
    setForm({
      diagnosis_name: "",
      justification: "",
      challenged_diagnosis: "",
      challenged_justification: "",
    });
    setDiagnosis(null);
    setIsEditing(false);
    setShowCreateForm(false);
    setActiveTab("search");
  };

  const startCreateNew = () => {
    resetForm();
    setShowCreateForm(true);
    setClientId("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center justify-between p-4 rounded-lg shadow-lg transition-all duration-300 ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : toast.type === "error"
                ? "bg-red-600 text-white"
                : "bg-blue-600 text-white"
            }`}
          >
            <span className="font-medium">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-3 text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="font-medium text-gray-700">{loadingState}</span>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Diagnostic Support System</h1>
              <p className="text-gray-600 mt-1">AI-Assisted Clinical Decision Support</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Connected</span>
              </div>
              <button
                onClick={handleLoadAll}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Client Search Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Client Diagnosis Lookup
            </h2>
            <p className="text-gray-600 mt-1">Search for a specific client's diagnosis record</p>
          </div>
          <div className="p-6">
            <div className="flex space-x-4">
              <div className="flex-1">
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                  Client ID (UUID)
                </label>
                <input
                  id="clientId"
                  type="text"
                  placeholder="Enter UUID (e.g., 550e8400-e29b-41d4-a716-446655440001)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGetByClient()}
                />
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Sample Client IDs:</p>
                  <div className="flex flex-wrap gap-1">
                    {sampleClientIds.slice(0, 3).map((id, idx) => (
                      <button
                        key={id}
                        onClick={() => setClientId(id)}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Client {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleGetByClient}
                  disabled={loading || !clientId.trim()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Diagnosis Details */}
          <div className="lg:col-span-2">
            {diagnosis ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200">
                  <nav className="flex">
                    {[
                      { id: "edit", label: "Diagnosis Details", icon: "📋" },
                      { id: "challenge", label: "Challenge AI", icon: "🤔" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === "edit" && (
                    <div className="space-y-6">
                      {/* AI Diagnosis Display */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-lg">🤖</span>
                              <h3 className="font-semibold text-blue-900">AI-Predicted Diagnosis</h3>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Confidence: High
                              </span>
                            </div>
                            {isEditing ? (
                              <input
                                type="text"
                                value={form.diagnosis_name}
                                onChange={(e) => setForm({ ...form, diagnosis_name: e.target.value })}
                                className="text-lg font-medium text-blue-900 mb-2 w-full px-2 py-1 border border-blue-300 rounded bg-white"
                                placeholder="Enter diagnosis_name..."
                              />
                            ) : (
                              <p className="text-lg font-medium text-blue-900 mb-2">{diagnosis.diagnosis_name}</p>
                            )}
                            <div className="text-sm text-blue-700">
                              <strong>Predicted:</strong> {new Date(diagnosis.predicted_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={handleUpdate}
                                  disabled={loading}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setIsEditing(false);
                                    setForm({
                                      diagnosis_name: diagnosis.diagnosis_name,
                                      justification: diagnosis.justification,
                                      challenged_diagnosis: diagnosis.challenged_diagnosis || "",
                                      challenged_justification: diagnosis.challenged_justification || "",
                                    });
                                  }}
                                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setIsEditing(true)}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Justification */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <span className="mr-2">📊</span>
                          AI Reasoning & Justification
                        </h4>
                        {isEditing ? (
                          <textarea
                            value={form.justification}
                            onChange={(e) => setForm({ ...form, justification: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={4}
                            placeholder="Enter justification..."
                          />
                        ) : (
                          <p className="text-gray-700 leading-relaxed">{diagnosis.justification}</p>
                        )}
                      </div>

                      {/* Challenge Section (if exists) */}
                      {diagnosis.challenged_diagnosis && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="font-semibold text-red-900 mb-2 flex items-center">
                            <span className="mr-2">⚠️</span>
                            Therapist Challenge
                          </h4>
                          <div className="space-y-2">
                            <p className="font-medium text-red-800">Challenged Diagnosis: {diagnosis.challenged_diagnosis}</p>
                            <p className="text-red-700">{diagnosis.challenged_justification}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "challenge" && (
                    <div className="space-y-6">
                      <div className="text-center py-4">
                        <span className="text-4xl">🤔</span>
                        <h3 className="text-xl font-semibold text-gray-900 mt-2">Challenge AI Diagnosis</h3>
                        <p className="text-gray-600 mt-1">Provide challenged diagnosis and reasoning</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Challenged Diagnosis *
                          </label>
                          <input
                            type="text"
                            value={form.challenged_diagnosis}
                            onChange={(e) => setForm({ ...form, challenged_diagnosis: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your challenged diagnosis..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Challenged Justification *
                          </label>
                          <textarea
                            value={form.challenged_justification}
                            onChange={(e) => setForm({ ...form, challenged_justification: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={4}
                            placeholder="Explain why you believe this challenged diagnosis is more accurate..."
                          />
                        </div>
                        <button
                          onClick={handleUpdate}
                          disabled={loading || !form.challenged_diagnosis.trim() || !form.challenged_justification.trim()}
                          className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          Submit Challenge
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Diagnosis Selected</h3>
                <p className="text-gray-600 mb-6">Enter a client ID above to view their diagnosis, or create a new one</p>
                <div className="space-x-3">
                  <button
                    onClick={startCreateNew}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create New Diagnosis
                  </button>
                  <button
                    onClick={() => setActiveTab("search")}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Search Existing
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-3">
                <button
                  onClick={startCreateNew}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-3"
                >
                  <span className="text-lg">👤</span>
                  <div>
                    <div className="font-medium text-gray-900">New Client</div>
                    <div className="text-sm text-gray-600">Create diagnosis</div>
                  </div>
                </button>
                <button
                  onClick={handleLoadAll}
                  disabled={loading}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-3 disabled:opacity-50"
                >
                  <span className="text-lg">🔄</span>
                  <div>
                    <div className="font-medium text-gray-900">Refresh Data</div>
                    <div className="text-sm text-gray-600">Update diagnosis list</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Diagnoses */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center justify-between">
                  Recent Diagnoses
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {diagnoses.length}
                  </span>
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {diagnoses.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {diagnoses.slice(0, 10).map((d) => (
                      <div
                        key={d.id}
                        className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setClientId(d.client_id);
                          handleGetByClient();
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {d.diagnosis_name}
                            </p>
                            <p className="text-sm text-gray-600">Client {d.client_id.slice(0, 8)}...</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(d.predicted_date).toLocaleDateString()}
                            </p>
                          </div>
                          {d.challenged_diagnosis && (
                            <span className="ml-2 w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-2"></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-4xl mb-2">📋</div>
                    <p>No diagnoses yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create New Diagnosis Form */}
        {(showCreateForm || (!diagnosis && clientId)) && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="mr-2">➕</span>
                  Create New Diagnosis {clientId && `for Client ${clientId.slice(0, 8)}...`}
                </div>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {!clientId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID (UUID) *
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter client UUID..."
                  />
                  <div className="mt-1">
                    <p className="text-xs text-gray-500 mb-1">Or use a sample:</p>
                    <div className="flex flex-wrap gap-1">
                      {sampleClientIds.slice(0, 3).map((id, idx) => (
                        <button
                          key={id}
                          onClick={() => setClientId(id)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          Sample {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnosis_Name *
                </label>
                <input
                  type="text"
                  value={form.diagnosis_name}
                  onChange={(e) => setForm({ ...form, diagnosis_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter diagnosis_name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Justification *
                </label>
                <textarea
                  value={form.justification}
                  onChange={(e) => setForm({ ...form, justification: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Provide clinical reasoning and supporting evidence..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleCreate}
                  disabled={loading || !clientId.trim() || !form.diagnosis_name.trim() || !form.justification.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Diagnosis
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Clear Form
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
