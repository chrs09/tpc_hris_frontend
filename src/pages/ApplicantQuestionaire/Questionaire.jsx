import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  createApplicantQuestion,
  getAdminApplicantQuestions,
  updateApplicantQuestion,
} from "../../api/applicantQuestions";

const initialForm = {
  target_role: "driver",
  key_suffix: "",
  question_text: "",
  question_type: "text",
  is_required: false,
  sort_order: "",
  is_active: true,
};

export default function Questionaire() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const [form, setForm] = useState(initialForm);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await getAdminApplicantQuestions();
      setQuestions(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load questions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const questionKeyPreview = useMemo(() => {
    const suffix = form.key_suffix
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    return suffix ? `${form.target_role}_${suffix}` : `${form.target_role}_...`;
  }, [form.target_role, form.key_suffix]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        question.question_text
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        question.question_key?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        roleFilter === "all" || question.target_role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && question.is_active) ||
        (statusFilter === "inactive" && !question.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [questions, searchTerm, roleFilter, statusFilter]);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddClick = () => {
    setEditingQuestion(null);
    setForm(initialForm);
    setShowForm(true);
  };

  const handleEditClick = (question) => {
    setEditingQuestion(question);
    setForm({
      target_role: question.target_role || "driver",
      key_suffix:
        question.question_key?.replace(`${question.target_role}_`, "") || "",
      question_text: question.question_text || "",
      question_type: question.question_type || "text",
      is_required: question.is_required || false,
      sort_order: question.sort_order ?? "",
      is_active: question.is_active ?? true,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingQuestion(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.question_text.trim()) {
      toast.error("Question text is required.");
      return;
    }

    if (!editingQuestion && !form.key_suffix.trim()) {
      toast.error("Key suffix is required.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        target_role: form.target_role,
        question_text: form.question_text,
        question_type: form.question_type,
        is_required: form.is_required,
        sort_order: form.sort_order === "" ? null : Number(form.sort_order),
        is_active: form.is_active,
      };

      if (editingQuestion) {
        await updateApplicantQuestion(editingQuestion.id, payload);
        toast.success("Question updated successfully.");
      } else {
        await createApplicantQuestion({
          ...payload,
          key_suffix: form.key_suffix,
        });
        toast.success("Question created successfully.");
      }

      handleCancel();
      loadQuestions();
    } catch (err) {
      console.error(err);
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === "string"
          ? detail
          : editingQuestion
            ? "Failed to update question."
            : "Failed to create question.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Applicant Questions
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage onboarding questions for applicants.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddClick}
              className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Add Question
            </button>
          </div>
        </div>

        {showForm && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              {editingQuestion ? "Edit Question" : "Create Applicant Question"}
            </h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Target Role
                </label>
                <select
                  value={form.target_role}
                  onChange={(e) => handleChange("target_role", e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="driver">Driver</option>
                  <option value="helper">Helper</option>
                  <option value="all">All</option>
                </select>
              </div>

              {!editingQuestion && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Key Suffix
                  </label>
                  <input
                    type="text"
                    value={form.key_suffix}
                    onChange={(e) => handleChange("key_suffix", e.target.value)}
                    placeholder="e.g. multitask"
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Question key preview:{" "}
                    <span className="font-semibold">{questionKeyPreview}</span>
                  </p>
                </div>
              )}

              {editingQuestion && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Question Key
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.question_key}
                    disabled
                    className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Question Text
                </label>
                <textarea
                  rows={3}
                  value={form.question_text}
                  onChange={(e) =>
                    handleChange("question_text", e.target.value)
                  }
                  placeholder="Enter the question to show to applicants"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Question Type
                </label>
                <select
                  value={form.question_type}
                  onChange={(e) =>
                    handleChange("question_type", e.target.value)
                  }
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="select">Select</option>
                  <option value="date">Date</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => handleChange("sort_order", e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_required}
                    onChange={(e) =>
                      handleChange("is_required", e.target.checked)
                    }
                  />
                  Required
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      handleChange("is_active", e.target.checked)
                    }
                  />
                  Active
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {submitting
                    ? editingQuestion
                      ? "Updating..."
                      : "Creating..."
                    : editingQuestion
                      ? "Update Question"
                      : "Create Question"}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-2xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Question List</h2>
              <p className="mt-1 text-sm text-gray-500">
                Search and filter applicant questions below.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search question text or key"
                className="rounded-2xl border border-gray-300 px-4 py-3 text-sm"
              />

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-2xl border border-gray-300 px-4 py-3 text-sm"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="driver">Driver</option>
                <option value="helper">Helper</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-gray-300 px-4 py-3 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-gray-500">
              Loading questions...
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
              No questions matched your filters.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="px-3 py-3 font-semibold text-gray-700">
                      Role
                    </th>
                    <th className="px-3 py-3 font-semibold text-gray-700">
                      Question Key
                    </th>
                    <th className="px-3 py-3 font-semibold text-gray-700">
                      Question Text
                    </th>
                    <th className="px-3 py-3 font-semibold text-gray-700">
                      Type
                    </th>
                    <th className="px-3 py-3 font-semibold text-gray-700">
                      Required
                    </th>
                    <th className="px-3 py-3 font-semibold text-gray-700">
                      Sort
                    </th>
                    <th className="px-3 py-3 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-3 py-3 font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.map((question) => (
                    <tr key={question.id} className="border-b border-gray-100">
                      <td className="px-3 py-3">{question.target_role}</td>
                      <td className="px-3 py-3">{question.question_key}</td>
                      <td className="px-3 py-3">{question.question_text}</td>
                      <td className="px-3 py-3">{question.question_type}</td>
                      <td className="px-3 py-3">
                        {question.is_required ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-3">{question.sort_order}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            question.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {question.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => handleEditClick(question)}
                          className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
