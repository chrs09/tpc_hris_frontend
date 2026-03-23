import { useState } from "react";
import { applicationSubmit } from "../../api/application";

export default function ApplicationForm() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    contact_number: "",
    position_applied: "",
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!file) {
      setMessage("Please upload your CV");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append("cv", file);

      await applicationSubmit(formData);

      setMessage("✅ Application submitted successfully!");

      setForm({
        first_name: "",
        last_name: "",
        email: "",
        contact_number: "",
        position_applied: "",
      });
      setFile(null);

    } catch (err) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-6">
      
      <div className="w-full max-w-xl bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 space-y-6 border border-gray-200">
        
        {/* HEADER */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Join Our Team
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Fill out the form below and upload your resume
          </p>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="text-sm text-center text-gray-700 bg-gray-100 py-2 rounded">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* NAME ROW */}
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="First Name"
              value={form.first_name}
              onChange={(e) => handleChange("first_name", e.target.value)}
              className="w-full border border-gray-200 focus:border-black focus:ring-1 focus:ring-black p-3 rounded-lg outline-none transition"
              required
            />

            <input
              placeholder="Last Name"
              value={form.last_name}
              onChange={(e) => handleChange("last_name", e.target.value)}
              className="w-full border border-gray-200 focus:border-black focus:ring-1 focus:ring-black p-3 rounded-lg outline-none transition"
              required
            />
          </div>

          <input
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full border border-gray-200 focus:border-black focus:ring-1 focus:ring-black p-3 rounded-lg outline-none transition"
            required
          />

          <input
            placeholder="Contact Number"
            value={form.contact_number}
            onChange={(e) => handleChange("contact_number", e.target.value)}
            className="w-full border border-gray-200 focus:border-black focus:ring-1 focus:ring-black p-3 rounded-lg outline-none transition"
            required
          />

          <input
            placeholder="Position Applied"
            value={form.position_applied}
            onChange={(e) => handleChange("position_applied", e.target.value)}
            className="w-full border border-gray-200 focus:border-black focus:ring-1 focus:ring-black p-3 rounded-lg outline-none transition"
            required
          />

          {/* FILE UPLOAD */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-black transition">
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="hidden"
              id="fileUpload"
            />

            <label htmlFor="fileUpload" className="cursor-pointer">
              <p className="text-sm text-gray-600">
                {file ? (
                  <span className="font-medium text-black">
                    📄 {file.name}
                  </span>
                ) : (
                  "Click to upload CV (PDF or Image)"
                )}
              </p>
            </label>
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            {loading ? "Submitting..." : "Submit Application"}
          </button>

        </form>
      </div>
    </div>
  );
}