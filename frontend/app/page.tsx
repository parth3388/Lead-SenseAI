"use client";

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  HeartHandshake,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trees,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type SearchFormState = {
  name: string;
  city: string;
  propertyType: string;
  areaSqFt: string;
  budget: string;
  requirements: string;
  urgencyScore: string;
};

type StatusState = {
  type: "" | "success" | "error";
  message: string;
};

const INITIAL_FORM: SearchFormState = {
  name: "",
  city: "",
  propertyType: "Office",
  areaSqFt: "",
  budget: "",
  requirements: "",
  urgencyScore: "5",
};

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    if (!form.name.trim() || !form.city.trim() || !form.propertyType.trim()) {
      setStatus({
        type: "error",
        message: "Please fill customer name, city, and property type first.",
      });
      return;
    }

    setSubmitting(true);

    const payload = {
      ...form,
      name: form.name.trim(),
      city: form.city.trim(),
      propertyType: form.propertyType.trim(),
      requirements: form.requirements.trim(),
    };

    window.sessionStorage.setItem("leadsense-customer-search", JSON.stringify(payload));

    const params = new URLSearchParams(payload).toString();
    router.push(`/properties?${params}`);
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7f4ed_0%,_#fffdf8_44%,_#f5efe6_100%)] text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 lg:px-8">
        <header className="rounded-[2rem] border border-[#d9cfbc] bg-white/85 px-6 py-5 shadow-[0_20px_80px_rgba(95,74,46,0.10)] backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-[#1f4d3d] text-[#f7f4ed] shadow-lg shadow-[#1f4d3d]/20">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xl font-black tracking-tight">LeadSense Properties</p>
                <p className="text-sm text-slate-600">
                  Customers enter their needs first, then they see generated properties for that exact city and selected property type before choosing buyer or visitor mode.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                Back to Login
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full bg-[#1f4d3d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#17392d]"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-8 py-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-[#e2d7c5] bg-[radial-gradient(circle_at_top_left,_rgba(31,77,61,0.18),_transparent_42%),linear-gradient(135deg,_#fffdf8,_#f3ede2)] p-7 shadow-[0_20px_70px_rgba(90,70,41,0.08)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#c9b58d] bg-[#f4e4b8] px-4 py-2 text-sm font-semibold text-[#5b461f]">
                <Sparkles className="h-4 w-4" />
                Search-first customer journey
              </div>
              <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl">
                Collect customer needs first, then open a property page matched to that city.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                Example: if a customer asks for a 400 sq ft office in Agra, the next page shows Agra office properties only. If the city is Aligarh, it shows Aligarh properties only. If the type is Shop, Villa, or Apartment, the results show only that selected type.
              </p>

              <div className="mt-7 grid gap-4 md:grid-cols-3">
                <InfoCard title="Requirement Form" text="Name, city, area, and property need are captured first." icon={Search} />
                <InfoCard title="Matched Results" text="The next page shows 4 to 5 relevant properties with facilities." icon={Star} />
                <InfoCard title="Buyer or Visitor" text="The selected action decides what kind of lead reaches the dashboard." icon={HeartHandshake} />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  title: "City-Specific Search",
                  detail: "Example: 400 sq ft office in Agra or Aligarh opens results for that exact city.",
                },
                {
                  title: "Strict Type Filter",
                  detail: "If the customer selects Shop, Villa, Apartment, or Office, only that property type is shown.",
                },
                {
                  title: "Facilities Visible",
                  detail: "Each generated result still shows amenities like parking, lift, clubhouse, security, and more.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-[1.8rem] border border-[#e1d8ca] bg-white p-6 shadow-[0_16px_40px_rgba(148,124,91,0.08)]"
                >
                  <div className="inline-flex rounded-full bg-[#f6ead2] px-3 py-2 text-xs font-bold text-[#8c6d33]">
                    Demo flow
                  </div>
                  <h3 className="mt-4 text-2xl font-black tracking-tight">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-8 top-6 h-44 rounded-full bg-[#d7c3a1]/50 blur-3xl" />
            <div className="relative rounded-[2rem] border border-[#dfd2bf] bg-white p-6 shadow-[0_30px_100px_rgba(41,35,24,0.14)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8c6d33]">
                    Customer Requirement Form
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">Start property search</h2>
                </div>
                <div className="rounded-2xl bg-[#edf5f2] px-3 py-2 text-xs font-bold text-[#1f4d3d]">
                  Results page linked
                </div>
              </div>

              <div className="mt-6 rounded-[1.7rem] bg-[#f7f4ed] p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                  Search example
                </p>
                <h3 className="mt-2 text-2xl font-black">Agra office, 400 sq ft</h3>
                <p className="mt-2 text-sm text-slate-600">
                  The next page shows matching office properties in Agra only. If you enter Aligarh and Shop, it shows only shop properties in Aligarh.
                </p>
                <p className="mt-4 text-lg font-bold text-[#1f4d3d]">
                  Buy Now = Buyer | Continue as Visitor = Visitor
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  This keeps the buyer and visitor decision on the property results page, not on the first form.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Customer name</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Enter full name"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#1f4d3d] focus:bg-white"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">City</span>
                    <input
                      value={form.city}
                      onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                      placeholder="Example: Agra or Aligarh"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#1f4d3d] focus:bg-white"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">Property type</span>
                    <select
                      value={form.propertyType}
                      onChange={(event) => setForm((current) => ({ ...current, propertyType: event.target.value }))}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#1f4d3d] focus:bg-white"
                    >
                      <option value="Office">Office</option>
                      <option value="Shop">Shop</option>
                      <option value="Apartment">Apartment</option>
                      <option value="Villa">Villa</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">Required area</span>
                    <input
                      value={form.areaSqFt}
                      onChange={(event) => setForm((current) => ({ ...current, areaSqFt: event.target.value }))}
                      placeholder="Example: 400"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#1f4d3d] focus:bg-white"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">Budget</span>
                    <input
                      value={form.budget}
                      onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))}
                      placeholder="Example: 4000000"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#1f4d3d] focus:bg-white"
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Urgency</span>
                  <select
                    value={form.urgencyScore}
                    onChange={(event) => setForm((current) => ({ ...current, urgencyScore: event.target.value }))}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#1f4d3d] focus:bg-white"
                  >
                    <option value="3">Low</option>
                    <option value="5">Medium</option>
                    <option value="8">High</option>
                    <option value="10">Immediate</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Customer requirement</span>
                  <textarea
                    value={form.requirements}
                    onChange={(event) => setForm((current) => ({ ...current, requirements: event.target.value }))}
                    rows={5}
                    placeholder="Example: I want 1 office around 400 sq ft in Agra with parking, lift, and good road access."
                    className="rounded-[1.7rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#1f4d3d] focus:bg-white"
                  />
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1f4d3d] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#17392d] disabled:cursor-not-allowed disabled:bg-[#87a699]"
                >
                  {submitting ? "Opening Results..." : "Show Matching Properties"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              {status.message ? (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                    status.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {status.type === "success" ? (
                    <CheckCircle2 className="mr-2 inline h-4 w-4" />
                  ) : null}
                  {status.message}
                </div>
              ) : null}

              <div className="mt-6 rounded-[1.5rem] bg-[#f4efe6] p-5 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-bold text-[#1f4d3d]">
                  <ShieldCheck className="h-4 w-4" />
                  Lead flow summary
                </div>
                <p className="mt-2 leading-7">
                  Page 1 only collects requirements. Page 2 shows city-matched properties. The chosen property action decides whether the dashboard receives a buyer lead or a visitor lead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  title,
  text,
  icon: Icon,
}: {
  title: string;
  text: string;
  icon: typeof Trees;
}) {
  return (
    <div className="rounded-[1.6rem] border border-[#e2d8c8] bg-white/80 p-5 shadow-[0_16px_50px_rgba(115,92,63,0.08)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5efe4] text-[#1f4d3d]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-base font-black">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
