"use client";

import {
  Activity,
  ArrowRight,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Moon,
  Pencil,
  PieChart as ChartIcon,
  Search,
  Settings as SettingsIcon,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import api from "../../lib/api";
import { getApiBaseUrl } from "../../lib/config";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIPELINE_STAGES = ["New", "Contacted", "Qualified", "Converted"];
const TAG_OPTIONS = ["Hot", "Warm", "Cold"];
const EMPTY_EDIT_FORM = {
  name: "",
  interest: "",
  budget: "",
  urgencyScore: "",
  location: "",
  source: "",
  industry: "",
  score: "",
  status: "New",
  tag: "Warm",
};

export default function LeadSenseUltimate() {
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [budgetFilter, setBudgetFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [notification, setNotification] = useState(null);
  const [user, setUser] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [leadInsights, setLeadInsights] = useState({});
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [noteDrafts, setNoteDrafts] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setUser(decoded);
      } catch (err) {
        console.error("Invalid token format", err);
      }

      try {
        const res = await api.get("/leads", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLeads(res.data);
      } catch (err) {
        console.error("API Error - check if backend is running at :5000", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const socket = io(getApiBaseUrl());

    socket.on("lead-updated", payload => {
      setLeads(prev => {
        const existingIndex = prev.findIndex(lead => lead.id === payload.lead.id);

        if (existingIndex === -1) {
          return [payload.lead, ...prev];
        }

        return prev.map(lead => (lead.id === payload.lead.id ? payload.lead : lead));
      });

      if (payload.type === "created" && payload.highIntent) {
        setNotification("High-intent lead detected");
        setTimeout(() => setNotification(null), 3000);
      }

      if (payload.type === "updated") {
        setNotification(`Lead updated live: ${payload.lead.name}`);
        setTimeout(() => setNotification(null), 2000);
      }
    });

    socket.on("lead-deleted", payload => {
      setLeads(prev => prev.filter(lead => lead.id !== payload.id));
      setNotification("Lead removed from dashboard");
      setTimeout(() => setNotification(null), 2000);
    });

    return () => socket.disconnect();
  }, []);

  const toggleTheme = () => setTheme(current => (current === "light" ? "dark" : "light"));

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const getToken = () => localStorage.getItem("token");

  const updateLead = async (id, payload) => {
    const token = getToken();
    const res = await api.patch(`/leads/${id}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setLeads(prev => prev.map(lead => (lead.id === id ? res.data : lead)));
    return res.data;
  };

  const moveLead = async (lead, newStatus) => {
    await updateLead(lead.id, {
      status: newStatus,
      converted: newStatus === "Converted" ? 1 : 0,
    });
  };

  const deleteLead = async id => {
    const shouldDelete = window.confirm("Delete this lead?");
    if (!shouldDelete) return;

    const token = getToken();
    await api.delete(`/leads/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setLeads(prev => prev.filter(lead => lead.id !== id));

    if (editingLeadId === id) {
      setEditingLeadId(null);
      setEditForm(EMPTY_EDIT_FORM);
    }
  };

  const openEditLead = lead => {
    setEditingLeadId(lead.id);
    setEditForm({
      name: lead.name || "",
      interest: lead.interest || "",
      budget: String(lead.budget || ""),
      urgencyScore: String(lead.urgencyScore || 5),
      location: lead.location || "",
      source: lead.source || "",
      industry: lead.industry || "",
      score: String(lead.score || ""),
      status: lead.status || "New",
      tag: lead.tag || "Warm",
    });
  };

  const saveLeadChanges = async () => {
    if (!editingLeadId) return;

    const payload = {
      name: editForm.name.trim(),
      budget: Number(editForm.budget) || 0,
      urgencyScore: Number(editForm.urgencyScore) || 5,
      location: editForm.location.trim(),
      score: Number(editForm.score) || 0,
      status: editForm.status,
      tag: editForm.tag,
      converted: editForm.status === "Converted" ? 1 : 0,
    };

    const interest = editForm.interest.trim();
    const source = editForm.source.trim();
    const industry = editForm.industry.trim();

    if (interest) {
      payload.interest = interest;
    }

    if (source) {
      payload.source = source;
    }

    if (industry) {
      payload.industry = industry;
    }

    await updateLead(editingLeadId, payload);
    setEditingLeadId(null);
    setEditForm(EMPTY_EDIT_FORM);
  };

  const addNote = async leadId => {
    const text = noteDrafts[leadId]?.trim();
    if (!text) return;

    const token = getToken();
    const res = await api.post(
      `/leads/${leadId}/notes`,
      { text },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setLeads(prev => prev.map(lead => (lead.id === leadId ? res.data : lead)));
    setNoteDrafts(prev => ({ ...prev, [leadId]: "" }));
  };

  const runAI = async () => {
    const token = getToken();

    try {
      const res = await api.get("/ai-analysis", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAiData(res.data);
      alert("AI Analysis Complete!");
    } catch (err) {
      console.error(err);
      alert("AI Error");
    }
  };

  const fetchRecommendations = async () => {
    const token = getToken();

    try {
      const res = await api.get("/ai-recommendations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAiRecommendations(res.data.recommendations || []);
    } catch (error) {
      console.error(error);
      alert("Unable to load AI recommendations right now.");
    }
  };

  const explainLead = async leadId => {
    const token = getToken();

    try {
      const res = await api.get(`/lead-reasoning/${leadId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setLeadInsights(prev => ({
        ...prev,
        [leadId]: {
          ...(prev[leadId] || {}),
          reasoning: res.data.reasoning,
        },
      }));
    } catch (error) {
      console.error(error);
      alert("Unable to explain this lead right now.");
    }
  };

  const generateOutreach = async (lead, channel) => {
    const token = getToken();

    try {
      const res = await api.post(
        "/generate-outreach",
        { lead, channel },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setLeadInsights(prev => ({
        ...prev,
        [lead.id]: {
          ...(prev[lead.id] || {}),
          [channel === "text" ? "textOutreach" : "emailOutreach"]: res.data.message,
        },
      }));

      alert(res.data.message);
    } catch (error) {
      console.error(error);
      alert("Unable to generate outreach right now.");
    }
  };

  const uniqueLocations = useMemo(
    () => [...new Set(leads.map(lead => lead.location).filter(Boolean))],
    [leads]
  );

  const uniqueSources = useMemo(
    () => [...new Set(leads.map(lead => lead.source).filter(Boolean))],
    [leads]
  );

  const uniqueIndustries = useMemo(
    () => [...new Set(leads.map(lead => lead.industry).filter(Boolean))],
    [leads]
  );

  const filteredLeads = useMemo(() => {
    const minBudget = budgetFilter ? Number(budgetFilter) : 0;
    const query = searchQuery.trim().toLowerCase();

    return leads.filter(lead => {
      const searchableText = [
        lead.name,
        lead.interest,
        lead.location,
        lead.source,
        lead.industry,
        lead.tag,
        lead.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !query || searchableText.includes(query);
      const matchesLocation = !locationFilter || lead.location === locationFilter;
      const matchesSource = !sourceFilter || lead.source === sourceFilter;
      const matchesIndustry = !industryFilter || (lead.industry || "General") === industryFilter;
      const matchesBudget = !minBudget || Number(lead.budget || 0) >= minBudget;

      return (
        matchesQuery &&
        matchesLocation &&
        matchesSource &&
        matchesIndustry &&
        matchesBudget
      );
    });
  }, [budgetFilter, industryFilter, leads, locationFilter, searchQuery, sourceFilter]);

  const stats = useMemo(() => {
    const total = filteredLeads.length;
    const avgScore =
      total > 0
        ? (
            filteredLeads.reduce((sum, lead) => sum + (Number(lead.score) || 0), 0) / total
          ).toFixed(1)
        : 0;
    const totalBudget = filteredLeads.reduce(
      (sum, lead) => sum + (Number(lead.budget) || 0),
      0
    );
    const buyerLeads = filteredLeads.filter(
      lead => lead.source === "Property Buyer"
    ).length;
    const visitorLeads = filteredLeads.filter(
      lead => lead.source === "Property Visitor"
    ).length;

    return { total, avgScore, totalBudget, buyerLeads, visitorLeads };
  }, [filteredLeads]);

  const scoreData = useMemo(
    () => [
      { name: "0-50", value: filteredLeads.filter(lead => lead.score < 50).length },
      {
        name: "50-80",
        value: filteredLeads.filter(lead => lead.score >= 50 && lead.score < 80).length,
      },
      { name: "80+", value: filteredLeads.filter(lead => lead.score >= 80).length },
    ],
    [filteredLeads]
  );

  const conversionData = useMemo(
    () => [
      {
        name: "Conversion",
        rate:
          filteredLeads.length > 0
            ? (filteredLeads.filter(lead => lead.converted).length / filteredLeads.length) * 100
            : 0,
      },
    ],
    [filteredLeads]
  );

  const monthlyData = useMemo(() => {
    const monthMap = {};

    filteredLeads.forEach(lead => {
      if (!lead.date) return;
      const month = lead.date.slice(0, 7);
      monthMap[month] = (monthMap[month] || 0) + 1;
    });

    return Object.entries(monthMap).map(([month, count]) => ({
      month,
      count,
    }));
  }, [filteredLeads]);

  const channelData = useMemo(() => {
    const sourceMap = {};

    filteredLeads.forEach(lead => {
      if (!lead.source) return;
      sourceMap[lead.source] = (sourceMap[lead.source] || 0) + 1;
    });

    return Object.entries(sourceMap).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredLeads]);

  const isDark = theme === "dark";
  const bgBase = isDark ? "bg-slate-950 text-slate-100" : "bg-[#f8fafc] text-slate-900";
  const bgCard = isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center font-bold text-blue-500">
        Connecting to Database...
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${bgBase}`}>
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-green-500 text-white px-4 py-2 rounded-xl shadow-lg">
          {notification}
        </div>
      )}

      {editingLeadId && (
        <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl rounded-3xl border p-6 shadow-2xl ${bgCard}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black">Edit Lead</h2>
              <button
                onClick={() => {
                  setEditingLeadId(null);
                  setEditForm(EMPTY_EDIT_FORM);
                }}
                className={`text-sm px-3 py-2 rounded-xl ${isDark ? "bg-slate-800" : "bg-slate-100"}`}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Lead name"
                className={`p-3 rounded-xl border ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
              />
              <input
                value={editForm.interest}
                onChange={e => setEditForm(prev => ({ ...prev, interest: e.target.value }))}
                placeholder="Customer interest"
                className={`p-3 rounded-xl border ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
              />
              <input
                value={editForm.budget}
                onChange={e => setEditForm(prev => ({ ...prev, budget: e.target.value }))}
                placeholder="Budget"
                type="number"
                className={`p-3 rounded-xl border ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
              />
              <input
                value={editForm.urgencyScore}
                onChange={e => setEditForm(prev => ({ ...prev, urgencyScore: e.target.value }))}
                placeholder="Urgency score"
                type="number"
                min="1"
                max="10"
                className={`p-3 rounded-xl border ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
              />
              <input
                value={editForm.location}
                onChange={e => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Location"
                className={`p-3 rounded-xl border ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
              />
              <input
                value={editForm.source}
                onChange={e => setEditForm(prev => ({ ...prev, source: e.target.value }))}
                placeholder="Source"
                className={`p-3 rounded-xl border ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
              />
              <input
                value={editForm.industry}
                onChange={e => setEditForm(prev => ({ ...prev, industry: e.target.value }))}
                placeholder="Industry"
                className={`p-3 rounded-xl border ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
              />
              <input
                value={editForm.score}
                onChange={e => setEditForm(prev => ({ ...prev, score: e.target.value }))}
                placeholder="Score"
                type="number"
                className={`p-3 rounded-xl border ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
              />
              <select
                value={editForm.status}
                onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                className={`p-3 rounded-xl border ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
              >
                {PIPELINE_STAGES.map(stage => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
              <select
                value={editForm.tag}
                onChange={e => setEditForm(prev => ({ ...prev, tag: e.target.value }))}
                className={`p-3 rounded-xl border ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
              >
                {TAG_OPTIONS.map(tag => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => deleteLead(editingLeadId)}
                className="px-4 py-2 rounded-xl bg-red-500 text-white"
              >
                Delete Lead
              </button>
              <button
                onClick={saveLeadChanges}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className={`w-64 border-r flex flex-col shrink-0 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <Target className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">LeadSense AI</span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: "Dashboard", icon: LayoutDashboard },
            { id: "Pipeline", icon: Activity },
            { id: "Analytics", icon: ChartIcon },
            { id: "Settings", icon: SettingsIcon },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/40"
                  : `${textMuted} hover:bg-blue-500/10 hover:text-blue-500`
              }`}
            >
              <item.icon size={20} />
              <span className="font-semibold">{item.id}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
              isDark ? "border-slate-700 bg-slate-800 hover:bg-slate-700" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
            }`}
          >
            {isDark ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-blue-600" />}
            <span className="font-bold text-sm">{isDark ? "Switch to Light" : "Switch to Night"}</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 mt-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black">{activeTab}</h1>
            <p className={`${textMuted} text-sm font-medium`}>
              Manage your leads, tags, comments, and pipeline from one workspace.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={runAI}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Run AI Analysis
            </button>
            <button
              onClick={fetchRecommendations}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              AI Recommendations
            </button>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                placeholder="Search leads, tags, stage, source..."
                className={`w-full pl-10 pr-4 py-2 rounded-full border text-sm outline-none transition-all ${
                  isDark ? "bg-slate-900 border-slate-700 focus:border-blue-500" : "bg-white border-slate-200 focus:border-blue-600"
                }`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className={`p-3 border rounded-xl ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
          >
            <option value="">All Locations</option>
            {uniqueLocations.map(location => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className={`p-3 border rounded-xl ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
          >
            <option value="">All Sources</option>
            {uniqueSources.map(source => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          <select
            value={industryFilter}
            onChange={e => setIndustryFilter(e.target.value)}
            className={`p-3 border rounded-xl ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
          >
            <option value="">All Industries</option>
            {uniqueIndustries.map(industry => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Minimum Budget"
            value={budgetFilter}
            onChange={e => setBudgetFilter(e.target.value)}
            className={`p-3 border rounded-xl ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
          />
        </div>

        {user?.role === "admin" && (
          <div className={`mb-6 p-4 rounded-3xl border ${bgCard}`}>
            <h2 className="text-lg font-bold mb-2">Admin Controls</h2>
            <p className={`${textMuted} text-sm`}>
              Admin users can edit lead details, delete records, and manage pipeline quality checks.
            </p>
          </div>
        )}

        {activeTab === "Dashboard" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
              <StatCard isDark={isDark} label="Filtered Leads" value={stats.total} icon={Users} color="blue" />
              <StatCard isDark={isDark} label="Avg AI Lead Score" value={stats.avgScore} icon={TrendingUp} color="green" />
              <StatCard
                isDark={isDark}
                label="Filtered Pipeline Value"
                value={`$${stats.totalBudget.toLocaleString()}`}
                icon={DollarSign}
                color="purple"
              />
              <StatCard
                isDark={isDark}
                label="Property Buyers"
                value={stats.buyerLeads}
                icon={Target}
                color="green"
              />
              <StatCard
                isDark={isDark}
                label="Property Visitors"
                value={stats.visitorLeads}
                icon={Activity}
                color="blue"
              />
            </div>

            {aiRecommendations.length > 0 && (
              <div className={`p-6 rounded-3xl border shadow-sm ${bgCard}`}>
                <h3 className="font-bold mb-6">Personalized Lead Recommendations</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {aiRecommendations.map(item => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border ${isDark ? "border-slate-700 bg-slate-950/70" : "border-slate-200 bg-slate-50"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold">{item.name}</p>
                        <span className="text-xs font-black text-blue-500">Score {item.score}</span>
                      </div>
                      <p className={`text-sm mb-2 ${textMuted}`}>{item.reason}</p>
                      <p className="text-sm font-medium">{item.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiData && (
              <div className="space-y-8 mt-10">
                <div className={`p-6 rounded-2xl shadow ${bgCard}`}>
                  <h2 className="text-xl font-bold mb-2">Best Model</h2>
                  <p className="text-blue-600 text-2xl font-bold">{aiData.best_model}</p>
                </div>

                <div className={`p-6 rounded-2xl shadow ${bgCard}`}>
                  <h2 className="text-xl font-bold mb-4">Model Comparison</h2>
                  <table className="w-full text-left">
                    <thead>
                      <tr className={`${textMuted}`}>
                        <th>Model</th>
                        <th>Accuracy</th>
                        <th>Precision</th>
                        <th>Recall</th>
                        <th>ROC-AUC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(aiData.model_comparison).map(([model, data]) => (
                        <tr key={model} className={`border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                          <td>{model}</td>
                          <td>{data.accuracy}</td>
                          <td>{data.precision}</td>
                          <td>{data.recall}</td>
                          <td>{data.roc_auc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <MetricBarsCard
                  title="Feature Importance"
                  data={aiData.feature_importance}
                  colorClass="bg-blue-500"
                  bgCard={bgCard}
                  isDark={isDark}
                />

                <MetricBarsCard
                  title="SHAP Importance"
                  data={aiData.shap_importance}
                  colorClass="bg-purple-500"
                  bgCard={bgCard}
                  isDark={isDark}
                />
              </div>
            )}

            <div className={`p-6 rounded-3xl border shadow-sm ${bgCard}`}>
              <h3 className="font-bold mb-6">Lead Score Pattern Across Active Results</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredLeads}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", backgroundColor: isDark ? "#0f172a" : "#fff" }} />
                    <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Pipeline" && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-in zoom-in-95 duration-300">
            {PIPELINE_STAGES.map(status => (
              <div
                key={status}
                className={`p-4 rounded-3xl border-2 border-dashed ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-slate-100/50 border-slate-200"}`}
              >
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="font-black text-xs uppercase tracking-widest text-blue-500">{status}</h3>
                  <span className="text-xs font-bold opacity-50">
                    {filteredLeads.filter(lead => lead.status === status).length}
                  </span>
                </div>

                <div className="space-y-4">
                  {filteredLeads
                    .filter(lead => lead.status === status)
                    .map(lead => {
                      const nextStatus = getNextStatus(lead.status);

                      return (
                        <div key={lead.id} className={`p-5 rounded-2xl border shadow-sm ${bgCard}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-sm mb-1">{lead.name}</p>
                              <p className={`text-[10px] font-bold uppercase mb-3 ${textMuted}`}>
                                {lead.industry || "General"}
                              </p>
                            </div>
                            <TagBadge tag={lead.tag || "Warm"} />
                          </div>

                          {lead.interest && (
                            <div
                              className={`mb-4 rounded-2xl border px-3 py-3 text-xs leading-5 ${
                                isDark
                                  ? "border-slate-700 bg-slate-950/80 text-slate-300"
                                  : "border-amber-100 bg-amber-50 text-slate-700"
                              }`}
                            >
                              {lead.interest}
                            </div>
                          )}

                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs">
                              <span className={textMuted}>Location</span>
                              <span>{lead.location || "N/A"}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className={textMuted}>Source</span>
                              <span>{lead.source || "N/A"}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className={textMuted}>Budget</span>
                              <span>${Number(lead.budget || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className={textMuted}>Score</span>
                              <span className="font-black text-blue-500">{lead.score}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className={textMuted}>Urgency</span>
                              <span>{lead.urgencyScore || 5}/10</span>
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className={`text-[11px] font-bold uppercase tracking-wider ${textMuted}`}>
                              Lead Temperature
                            </label>
                            <select
                              value={lead.tag || "Warm"}
                              onChange={e => updateLead(lead.id, { tag: e.target.value })}
                              className={`mt-2 w-full p-2 rounded-xl border text-sm ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
                            >
                              {TAG_OPTIONS.map(tag => (
                                <option key={tag} value={tag}>
                                  {tag}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                                Notes / Comments
                              </p>
                              <span className={`text-[10px] ${textMuted}`}>
                                {(lead.notes || []).length} saved
                              </span>
                            </div>
                            <div className="space-y-2 max-h-28 overflow-auto">
                              {(lead.notes || []).length > 0 ? (
                                lead.notes.map(note => (
                                  <div
                                    key={note.id}
                                    className={`text-xs p-2 rounded-xl ${isDark ? "bg-slate-950" : "bg-slate-50"}`}
                                  >
                                    <p>{note.text}</p>
                                    <p className={`mt-1 ${textMuted}`}>
                                      {new Date(note.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className={`text-xs ${textMuted}`}>No notes yet.</p>
                              )}
                            </div>
                            <textarea
                              value={noteDrafts[lead.id] || ""}
                              onChange={e => setNoteDrafts(prev => ({ ...prev, [lead.id]: e.target.value }))}
                              placeholder="Add a quick note..."
                              className={`mt-2 w-full p-2 rounded-xl border text-sm min-h-[72px] ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}
                            />
                            <button
                              onClick={() => addNote(lead.id)}
                              className="mt-2 text-xs bg-slate-800 text-white px-3 py-2 rounded-xl"
                            >
                              Save Note
                            </button>
                          </div>

                          {leadInsights[lead.id]?.reasoning && (
                            <div className={`mb-4 p-3 rounded-xl text-sm ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 mb-1">
                                Why This Lead?
                              </p>
                              <p>{leadInsights[lead.id].reasoning}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const token = getToken();
                                  const res = await api.post(
                                    "/generate-email",
                                    lead,
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    }
                                  );

                                  alert(res.data.email);
                                } catch (error) {
                                  const message =
                                    error?.response?.data?.message ||
                                    "Unable to generate email right now.";

                                  alert(message);
                                }
                              }}
                              className="text-xs bg-purple-500 text-white px-3 py-2 rounded-xl"
                            >
                              Generate Email
                            </button>

                            <button
                              onClick={() => generateOutreach(lead, "text")}
                              className="text-xs bg-emerald-600 text-white px-3 py-2 rounded-xl"
                            >
                              Generate Text
                            </button>

                            <button
                              onClick={() => explainLead(lead.id)}
                              className={`text-xs px-3 py-2 rounded-xl ${isDark ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-700"}`}
                            >
                              Why this lead?
                            </button>

                            {nextStatus && (
                              <button
                                onClick={() => moveLead(lead, nextStatus)}
                                className="text-xs bg-blue-600 text-white px-3 py-2 rounded-xl flex items-center gap-2"
                              >
                                Move to {nextStatus} <ArrowRight size={14} />
                              </button>
                            )}

                            <button
                              onClick={() => openEditLead(lead)}
                              className={`text-xs px-3 py-2 rounded-xl flex items-center gap-2 ${isDark ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-700"}`}
                            >
                              <Pencil size={14} />
                              Edit
                            </button>

                            <button
                              onClick={() => deleteLead(lead.id)}
                              className="text-xs bg-red-500 text-white px-3 py-2 rounded-xl flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
            <Card title="Conversion Rate" bgCard={bgCard}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={conversionData}>
                  <XAxis dataKey="name" />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Lead Score Distribution" bgCard={bgCard}>
              <div className="flex flex-col items-center">
                <PieChart width={300} height={300}>
                  <Pie data={scoreData} dataKey="value" outerRadius={100}>
                    <Cell fill="#ef4444" />
                    <Cell fill="#facc15" />
                    <Cell fill="#22c55e" />
                  </Pie>
                  <Tooltip />
                </PieChart>
                <div className="flex gap-6 mt-4">
                  {["0-50", "50-80", "80+"].map((label, index) => (
                    <div key={label} className="flex items-center gap-2 text-xs font-bold">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          index === 0 ? "bg-red-500" : index === 1 ? "bg-yellow-400" : "bg-green-500"
                        }`}
                      />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card title="Monthly Trends" bgCard={bgCard}>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Lead Source Performance" bgCard={bgCard}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={channelData}>
                  <XAxis dataKey="name" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {activeTab === "Settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card title="Filter Summary" bgCard={bgCard}>
              <div className="space-y-3 text-sm">
                <p>
                  <span className={textMuted}>Search:</span> {searchQuery || "None"}
                </p>
                <p>
                  <span className={textMuted}>Location:</span> {locationFilter || "All"}
                </p>
                <p>
                  <span className={textMuted}>Source:</span> {sourceFilter || "All"}
                </p>
                <p>
                  <span className={textMuted}>Industry:</span> {industryFilter || "All"}
                </p>
                <p>
                  <span className={textMuted}>Minimum budget:</span> {budgetFilter || "None"}
                </p>
              </div>
            </Card>

            <Card title="Lead Workflow Coverage" bgCard={bgCard}>
              <div className="space-y-3 text-sm">
                <p>Full lead edit flow is available from the Pipeline tab.</p>
                <p>Delete actions are now supported for each lead card.</p>
                <p>Tags can be managed as Hot, Warm, or Cold directly in the pipeline.</p>
                <p>Notes and comments are saved per lead through the backend notes endpoint.</p>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function getNextStatus(status) {
  const currentIndex = PIPELINE_STAGES.indexOf(status);
  if (currentIndex === -1 || currentIndex === PIPELINE_STAGES.length - 1) {
    return null;
  }

  return PIPELINE_STAGES[currentIndex + 1];
}

function TagBadge({ tag }) {
  const styles = {
    Hot: "bg-red-500/15 text-red-500",
    Warm: "bg-amber-500/15 text-amber-500",
    Cold: "bg-cyan-500/15 text-cyan-500",
  };

  return (
    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${styles[tag] || styles.Warm}`}>
      {tag}
    </span>
  );
}

function MetricBarsCard({ title, data, colorClass, bgCard, isDark }) {
  return (
    <div className={`p-6 rounded-2xl shadow ${bgCard}`}>
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="mb-3">
          <div className="flex justify-between text-sm">
            <span>{key}</span>
            <span>{value}</span>
          </div>
          <div className={`w-full ${isDark ? "bg-slate-700" : "bg-gray-200"} h-2 rounded`}>
            <div className={`${colorClass} h-2 rounded`} style={{ width: `${value * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, isDark }) {
  const variants = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    green: "text-green-500 bg-green-500/10 border-green-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  };

  return (
    <div className={`p-6 rounded-3xl border transition-all hover:scale-[1.02] ${isDark ? "bg-slate-900 border-slate-800 shadow-xl shadow-black/20" : "bg-white border-slate-100 shadow-sm"}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border ${variants[color]}`}>
        <Icon size={24} />
      </div>
      <p className="text-xs font-black uppercase tracking-widest opacity-40 mb-1">{label}</p>
      <h3 className="text-3xl font-black">{value}</h3>
    </div>
  );
}

function Card({ title, children, bgCard }) {
  return (
    <div className={`p-8 rounded-3xl border ${bgCard}`}>
      <h3 className="font-bold mb-8 text-lg">{title}</h3>
      {children}
    </div>
  );
}
