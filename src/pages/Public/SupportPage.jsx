import { useEffect, useState } from "react";
import TytanLogo from "../../assets/logo/tytan-logo.jpg";
import {
  checkPublicTicket,
  getPublicSupportCategories,
  submitPublicTicket,
} from "../../api/publicSupport";

// Public customer support (no login): customers and stores file a ticket
// in a public category -- it goes to that category's team -- and check
// its status with the ticket number + the phone or email they used.
const EMPTY = { name: "", company: "", phone: "", email: "", title: "", description: "" };

const STATUS_STYLES = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30";

export default function SupportPage() {
  const [tab, setTab] = useState("new");
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [image, setImage] = useState(null);
  const [website, setWebsite] = useState(""); // honeypot -- stays empty
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const [lookup, setLookup] = useState({ ticketNo: "", contact: "" });
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    getPublicSupportCategories()
      .then(setCategories)
      .catch(() => setError("We couldn't load the support topics. Please try again later."));
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!categoryId) return setError("Pick a topic.");
    if (!form.name.trim() || !form.title.trim() || !form.description.trim()) {
      return setError("Please fill in your name, subject and details.");
    }
    if (!form.phone.trim() && !form.email.trim()) {
      return setError("Give a phone number or an email so we can reach you.");
    }
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => v.trim() && data.append(k, v.trim()));
    data.append("category_id", categoryId);
    data.append("website", website);
    if (image) data.append("image", image);
    try {
      setSubmitting(true);
      const result = await submitPublicTicket(data);
      setCreated({ ...result, contact: form.phone.trim() || form.email.trim() });
      setForm(EMPTY);
      setCategoryId("");
      setImage(null);
    } catch (err) {
      setError(err?.response?.data?.detail || "We couldn't send your ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const check = async (e) => {
    e.preventDefault();
    setError("");
    setStatus(null);
    if (!lookup.ticketNo.trim() || !lookup.contact.trim()) {
      return setError("Enter your ticket number and the phone or email you used.");
    }
    try {
      setChecking(true);
      setStatus(await checkPublicTicket(lookup.ticketNo.trim(), lookup.contact.trim()));
    } catch (err) {
      setError(err?.response?.data?.detail || "We couldn't find that ticket.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-slate-100 px-4 py-8" style={{ colorScheme: "light" }}>
      <div className="w-full max-w-xl space-y-5">
        <div className="flex items-center gap-4">
          <img src={TytanLogo} alt="" className="h-14 w-14 rounded-lg object-contain" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tytan Prime Support</h1>
            <p className="text-sm text-slate-600">
              Tell us about a delivery, a complaint or a problem with our app. We&apos;ll get
              back to you.
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-xl bg-white p-1 shadow-sm">
          {[
            ["new", "New ticket"],
            ["check", "Check status"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setError("");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                tab === key ? "bg-emerald-700 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {tab === "new" && created ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-slate-600">Thanks! We received your ticket.</p>
              <p className="font-mono text-2xl font-bold text-emerald-700">{created.ticket_no}</p>
              <p className="text-sm text-slate-600">
                Keep this number. Use it with your phone or email to check the status
                {created.contact.includes("@") ? ", and we'll email you updates" : ""}.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLookup({ ticketNo: created.ticket_no, contact: created.contact });
                    setTab("check");
                    setCreated(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Check status
                </button>
                <button
                  type="button"
                  onClick={() => setCreated(null)}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  File another
                </button>
              </div>
            </div>
          ) : tab === "new" ? (
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="sup-topic" className="mb-1 block text-sm font-semibold text-slate-800">
                  Topic
                </label>
                <select
                  id="sup-topic"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose a topic</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {categoryId && (
                  <p className="mt-1 text-xs text-slate-500">
                    {categories.find((c) => String(c.id) === String(categoryId))?.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="sup-name" className="mb-1 block text-sm font-semibold text-slate-800">
                    Your name
                  </label>
                  <input id="sup-name" value={form.name} onChange={set("name")} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="sup-company" className="mb-1 block text-sm font-semibold text-slate-800">
                    Store / company <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <input id="sup-company" value={form.company} onChange={set("company")} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="sup-phone" className="mb-1 block text-sm font-semibold text-slate-800">
                    Phone
                  </label>
                  <input
                    id="sup-phone"
                    type="tel"
                    value={form.phone}
                    onChange={set("phone")}
                    placeholder="09xx xxx xxxx"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="sup-email" className="mb-1 block text-sm font-semibold text-slate-800">
                    Email
                  </label>
                  <input id="sup-email" type="email" value={form.email} onChange={set("email")} className={inputClass} />
                </div>
              </div>
              <p className="-mt-2 text-xs text-slate-500">
                Give at least a phone or an email. Add an email to get updates.
              </p>
              <div>
                <label htmlFor="sup-title" className="mb-1 block text-sm font-semibold text-slate-800">
                  Subject
                </label>
                <input
                  id="sup-title"
                  value={form.title}
                  onChange={set("title")}
                  placeholder="e.g. Delivery arrived late"
                  maxLength={255}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="sup-details" className="mb-1 block text-sm font-semibold text-slate-800">
                  Details
                </label>
                <textarea
                  id="sup-details"
                  rows={5}
                  value={form.description}
                  onChange={set("description")}
                  maxLength={5000}
                  placeholder="What happened, when, and any shipment or invoice number."
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="sup-image" className="mb-1 block text-sm font-semibold text-slate-800">
                  Photo <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="sup-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                />
              </div>
              {/* Honeypot: hidden from people, filled only by bots. */}
              <input
                id="sup-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="hidden"
                aria-hidden="true"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Send ticket"}
              </button>
            </form>
          ) : (
            <form onSubmit={check} className="space-y-4" noValidate>
              <div>
                <label htmlFor="sup-no" className="mb-1 block text-sm font-semibold text-slate-800">
                  Ticket number
                </label>
                <input
                  id="sup-no"
                  value={lookup.ticketNo}
                  onChange={(e) => setLookup({ ...lookup, ticketNo: e.target.value })}
                  placeholder="TKT-2026-0001"
                  className={`${inputClass} font-mono uppercase`}
                />
              </div>
              <div>
                <label htmlFor="sup-contact" className="mb-1 block text-sm font-semibold text-slate-800">
                  Phone or email you used
                </label>
                <input
                  id="sup-contact"
                  value={lookup.contact}
                  onChange={(e) => setLookup({ ...lookup, contact: e.target.value })}
                  className={inputClass}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={checking}
                className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {checking ? "Checking..." : "Check status"}
              </button>

              {status && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-sm font-bold text-slate-900">{status.ticket_no}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_STYLES[status.status] || STATUS_STYLES.todo
                      }`}
                    >
                      {status.status_label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800">{status.title}</p>
                  <p className="text-xs text-slate-500">
                    {status.category} · filed{" "}
                    {new Date(`${status.created_at}Z`).toLocaleString()}
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-800">Replies from our team</p>
                    {status.replies.length === 0 ? (
                      <p className="text-sm text-slate-500">No replies yet. We&apos;ll update you here.</p>
                    ) : (
                      status.replies.map((r, i) => (
                        <div key={i} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
                          <p className="whitespace-pre-wrap">{r.body}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(`${r.created_at}Z`).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
