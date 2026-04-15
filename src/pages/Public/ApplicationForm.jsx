import { useState, useMemo } from "react";
import { applicationSubmit } from "../../api/application";

export default function ApplicationForm() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    contact_number: "",
    position_applied: "",
  });

  const [cvFile, setCvFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selfiePreview = useMemo(() => {
    if (!selfieFile) return null;
    return URL.createObjectURL(selfieFile);
  }, [selfieFile]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      contact_number: "",
      position_applied: "",
    });

    setCvFile(null);
    setSelfieFile(null);

    const cvInput = document.getElementById("cvUpload");
    const selfieInput = document.getElementById("selfieUpload");

    if (cvInput) cvInput.value = "";
    if (selfieInput) selfieInput.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!cvFile) {
      setMessage("Please upload your CV");
      return;
    }

    if (!selfieFile) {
      setMessage("Please upload your selfie photo");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      formData.append("cv", cvFile);
      formData.append("selfie_photo", selfieFile);

      await applicationSubmit(formData);

      setMessage("✅ Application submitted successfully!");
      resetForm();
    } catch (err) {
      setMessage(
        err?.response?.data?.detail || err.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#2b2b2b] flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 space-y-6 border border-gray-200">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Join Our Team</h2>
          <p className="text-gray-500 text-sm mt-1">
            Fill out the form below and upload your CV and selfie photo
          </p>
        </div>

        {message && (
          <div className="text-sm text-center text-gray-700 bg-gray-100 py-2 rounded">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="First Name"
              value={form.first_name}
              onChange={(e) => handleChange("first_name", e.target.value)}
              className="w-full border border-gray-400 focus:border-black focus:ring-1 focus:ring-black p-3 rounded-lg outline-none transition"
              required
            />

            <input
              placeholder="Last Name"
              value={form.last_name}
              onChange={(e) => handleChange("last_name", e.target.value)}
              className="w-full border border-gray-400 focus:border-black focus:ring-1 focus:ring-black p-3 rounded-lg outline-none transition"
              required
            />
          </div>

          <input
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full border border-gray-400 focus:border-black focus:ring-1 focus:ring-black p-3 rounded-lg outline-none transition"
            required
          />

          <input
            placeholder="Contact Number"
            value={form.contact_number}
            onChange={(e) => handleChange("contact_number", e.target.value)}
            className="w-full border border-gray-400 focus:border-black focus:ring-1 focus:ring-black p-3 rounded-lg outline-none transition"
            required
          />

          <input
            placeholder="Position Applied"
            value={form.position_applied}
            onChange={(e) => handleChange("position_applied", e.target.value)}
            className="w-full border border-gray-400 focus:border-black focus:ring-1 focus:ring-black p-3 rounded-lg outline-none transition"
            required
          />

          <div className="border-2 border-dashed border-gray-400 rounded-lg p-4 text-center hover:border-black transition">
            <input
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={(e) => setCvFile(e.target.files[0] || null)}
              className="hidden"
              id="cvUpload"
            />

            <label htmlFor="cvUpload" className="cursor-pointer block">
              <p className="text-sm text-gray-600">
                {cvFile ? (
                  <span className="font-medium text-black">
                    📄 {cvFile.name}
                  </span>
                ) : (
                  "Click to upload CV"
                )}
              </p>
            </label>
          </div>

          <div className="border-2 border-dashed border-gray-400 rounded-lg p-4 text-center hover:border-black transition">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelfieFile(e.target.files[0] || null)}
              className="hidden"
              id="selfieUpload"
            />

            <label htmlFor="selfieUpload" className="cursor-pointer block">
              <p className="text-sm text-gray-600">
                {selfieFile ? (
                  <span className="font-medium text-black">
                    🖼️ {selfieFile.name}
                  </span>
                ) : (
                  "Click to upload Selfie Photo"
                )}
              </p>
            </label>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WEBP only</p>
          </div>

          {selfiePreview && (
            <div className="flex justify-center">
              <img
                src={selfiePreview}
                alt="Selfie Preview"
                className="h-32 w-32 rounded-xl object-cover border border-gray-300"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-[#a09f9f] transition flex items-center justify-center gap-2 disabled:opacity-60"
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
