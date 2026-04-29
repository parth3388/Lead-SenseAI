"use client";

import { useState } from "react";
import api from "../../lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/login", {
        username,
        password,
      });

      localStorage.setItem("token", res.data.token);
      window.location.href = res.data.redirectTo || "/dashboard";
    } catch {
      alert("Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-purple-800 via-pink-600 to-orange-500 relative overflow-hidden">
      <div className="absolute top-10 text-center text-white">
        <h1 className="text-5xl font-bold">LeadSense AI</h1>
        <p className="text-gray-200 mt-2">Predict the leads that actually convert</p>
      </div>

      <div className="absolute w-[600px] h-[600px] bg-purple-500 opacity-30 blur-3xl rounded-full top-[-200px] left-[-200px] animate-pulse" />
      <div className="absolute w-[500px] h-[500px] bg-pink-500 opacity-20 blur-3xl rounded-full bottom-[-200px] right-[-200px] animate-pulse" />

      <div className="flex w-[900px] h-[500px] bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20 transition-all duration-700">
        <div className="w-1/2 flex flex-col justify-center items-center text-white p-10 text-center">
          <h1 className="text-4xl font-bold mb-4">Hello, Friend!</h1>
          <p className="text-gray-200">
            Enter your credentials and start using AI driven lead intelligence.
          </p>
        </div>

        <div className="w-1/2 bg-white rounded-r-2xl p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Sign In</h2>

          <div className="mb-4 rounded-lg bg-indigo-50 p-3 text-xs text-gray-700">
            Admin login: <span className="font-semibold">admin / 1234</span> opens dashboard.
            Customer login: <span className="font-semibold">customer / 1234</span> opens the property browsing website where buyers can score properties and create leads.
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-black"
            />

            <input
              type="password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-black"
            />

            <button className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-lg font-semibold hover:scale-105 transition">
              Sign In
            </button>
          </form>
        </div>
      </div>

      <div className="absolute bottom-10 text-center text-white px-4">
        <p className="text-lg font-medium">
          AI-powered lead scoring to identify high-value prospects instantly
        </p>
        <p className="text-sm text-gray-200 mt-1">
          Analyze behavior, predict conversions, and close deals faster
        </p>
      </div>
    </div>
  );
}
