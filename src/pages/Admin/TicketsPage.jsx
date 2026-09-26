import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import SectionTabs from "../../components/ui/sectionTabs/SectionTabs";
import SearchSelect from "../../components/SearchSelect";
import { confirmDialog } from "../../components/ui/dialog/dialogService";
import {
  getTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  uploadTicketImage,
  removeTicketImage,
  getTicketAssignees,
} from "../../api/tickets";

const getErrorMessage = (error) =>
  error.response?.data?.detail || error.message || "Something went wrong.";

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

const PRIORITY_STYLES = {
  high: "bg-danger/15 text-danger",
  medium: "bg-warning/15 text-warning",
  low: "bg-surface-active text-fg-muted",
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggingTicket, setDraggingTicket] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [users, setUsers] = useState([]);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTickets();
      setTickets(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    // Only IT employees can be assigned a ticket.
    getTicketAssignees()
      .then((data) => setUsers(data))
      .catch(() => setUsers([]));
  }, [loadTickets]);

  const handleDrop = async (columnKey) => {
    if (!draggingTicket || draggingTicket.status === columnKey) {
      setDraggingTicket(null);
      return;
    }

    const ticket = draggingTicket;
    setDraggingTicket(null);

    // Optimistic move -- feels instant, reconciled with the server
    // response (or rolled back on failure).
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, status: columnKey } : t)),
    );

    try {
      await updateTicket(ticket.id, { status: columnKey });
    } catch (error) {
      toast.error(getErrorMessage(error));
      loadTickets();
    }
  };

  return (
    <div className="space-y-5">
      <SectionTabs group="Administrator" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-fg">Tickets</h2>
          <p className="text-sm text-fg-subtle">
            Log change requests here so they're tracked in one place
            instead of scattered across chat -- drag a card between
            columns as work progresses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          + New Ticket
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-fg-subtle">
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const columnTickets = tickets.filter(
              (t) => t.status === column.key,
            );

            return (
              <div
                key={column.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(column.key);
                }}
                className="flex min-h-[200px] flex-col gap-3 rounded-2xl border border-border bg-surface-hover/50 p-3"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-fg">
                    {column.label}
                  </h3>
                  <span className="text-xs text-fg-subtle">
                    {columnTickets.length}
                  </span>
                </div>

                {columnTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-fg-subtle">
                    No tickets here.
                  </div>
                ) : (
                  columnTickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onDragStart={(e) => {
                        // Firefox (and some other browsers) require
                        // dataTransfer.setData to be called during
                        // dragstart, or the drag is treated as invalid
                        // and drop never fires -- Chrome is lenient about
                        // this but not every browser is.
                        e.dataTransfer.setData("text/plain", String(ticket.id));
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingTicket(ticket);
                      }}
                      onClick={() => setSelectedTicket(ticket)}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateTicketModal
          users={users}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadTickets();
          }}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          users={users}
          onClose={() => setSelectedTicket(null)}
          onChanged={() => {
            setSelectedTicket(null);
            loadTickets();
          }}
          onImageChanged={loadTickets}
        />
      )}
    </div>
  );
}

const TicketCard = ({ ticket, onDragStart, onClick }) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="cursor-grab rounded-xl border border-border bg-surface p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing"
    >
      {ticket.ticket_no && (
        <p className="mb-0.5 font-mono text-[10px] font-semibold tracking-wide text-fg-subtle">
          {ticket.ticket_no}
        </p>
      )}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-fg">{ticket.title}</h4>
        {ticket.priority && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.low
            }`}
          >
            {ticket.priority}
          </span>
        )}
      </div>

      {ticket.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-fg-subtle">
          {ticket.description}
        </p>
      )}

      {ticket.image_url && (
        <img
          src={ticket.image_url}
          alt=""
          onClick={(e) => {
            e.stopPropagation();
            setPreviewOpen(true);
          }}
          // Images are draggable by default in every browser, which
          // hijacks the card's own HTML5 drag-and-drop when the grab
          // starts over the thumbnail -- opt this element out so the
          // parent card's draggable always wins.
          draggable={false}
          className="mt-2 h-24 w-full cursor-zoom-in rounded-lg object-cover"
        />
      )}

      <div className="mt-2 flex items-center justify-between text-[11px] text-fg-subtle">
        <span>By {ticket.created_by_username || "Unknown"}</span>
        {ticket.assigned_to_username && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
            {ticket.assigned_to_username}
          </span>
        )}
      </div>

      {previewOpen && (
        <ImagePreviewOverlay
          url={ticket.image_url}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
};

// Full-size image preview -- shared by the ticket card thumbnail and
// the detail modal's image, both of which only show a small crop/thumb
// otherwise.
const ImagePreviewOverlay = ({ url, onClose }) => (
  <div
    className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4"
    onClick={(e) => {
      e.stopPropagation();
      onClose();
    }}
    role="dialog"
    aria-modal="true"
    aria-label="Image preview"
  >
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      aria-label="Close image preview"
      className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-2xl text-white transition hover:bg-black"
    >
      ×
    </button>

    <img
      src={url}
      alt=""
      onClick={(e) => e.stopPropagation()}
      className="max-h-[90vh] max-w-full rounded-xl object-contain"
    />
  </div>
);

const TICKET_TIPS = [
  "What should change, and where in the app?",
  "Why -- what problem does this solve?",
  "What does \"done\" look like?",
];

const CreateTicketModal = ({ users = [], onClose, onCreated }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }

    try {
      setSaving(true);
      const ticket = await createTicket({
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority || undefined,
      });

      if (image) {
        // The image needs the ticket's id, so it's uploaded as a second
        // step right after creation rather than in the same request.
        try {
          await uploadTicketImage(ticket.id, image);
        } catch (imageError) {
          toast.error(
            `Ticket created, but the image failed to upload: ${getErrorMessage(imageError)}`,
          );
          onCreated();
          return;
        }
      }

      toast.success("Ticket created.");
      onCreated();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-fg">New Ticket</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-subtle">
              Title
            </label>
            <input
              autoFocus
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              placeholder="Short summary of the change"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-fg-subtle">
              Description
            </label>
            <div className="mb-2 rounded-lg bg-surface-hover p-2.5 text-[11px] text-fg-subtle">
              For a clearer ticket, cover:
              <ul className="ml-4 mt-1 list-disc space-y-0.5">
                {TICKET_TIPS.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
            <textarea
              rows={5}
              className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              placeholder="e.g. On the Attendance page, the export button should also include the department filter that's currently applied, so exports match what's on screen."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-subtle">
                Priority (optional)
              </label>
              <SearchSelect
                value={
                  [
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ].find((option) => option.value === priority) || null
                }
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
                onChange={(option) => setPriority(option?.value ?? "")}
                placeholder="No priority"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-fg-subtle">
                Assigned to
              </label>
              <p className="rounded-xl border border-border bg-surface-hover p-3 text-sm text-fg-muted">
                {users.length
                  ? `IT -- ${users
                      .map((u) => u.employee_name || u.username)
                      .join(", ")}`
                  : "IT (no IT employee set up yet)"}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-fg-subtle">
              Image (optional)
            </label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt=""
                  onClick={() => setFullPreviewOpen(true)}
                  className="h-32 w-full cursor-zoom-in rounded-xl border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/80"
                >
                  ✕
                </button>
                {fullPreviewOpen && (
                  <ImagePreviewOverlay
                    url={imagePreview}
                    onClose={() => setFullPreviewOpen(false)}
                  />
                )}
              </div>
            ) : (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageChange}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-fg file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground"
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
};

const TicketDetailModal = ({
  ticket,
  users = [],
  onClose,
  onChanged,
  onImageChanged,
}) => {
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description || "");
  const [priority, setPriority] = useState(ticket.priority || "");
  const [status, setStatus] = useState(ticket.status);
  const [assigneeId, setAssigneeId] = useState(
    ticket.assigned_to_user_id ? String(ticket.assigned_to_user_id) : "",
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageUrl, setImageUrl] = useState(ticket.image_url || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const updated = await uploadTicketImage(ticket.id, file);
      setImageUrl(updated.image_url);
      toast.success("Image uploaded.");
      onImageChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      setUploadingImage(true);
      await removeTicketImage(ticket.id);
      setImageUrl(null);
      onImageChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }

    try {
      setSaving(true);
      await updateTicket(ticket.id, {
        title: title.trim(),
        description: description.trim(),
        priority: priority || null,
        status,
        // 0 explicitly unassigns -- see TicketUpdate's comment on the
        // backend for why this can't just be `null`/omitted.
        ...(assigneeId ? { assigned_to_user_id: Number(assigneeId) } : {}),
      });
      toast.success("Ticket updated.");
      onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!(await confirmDialog(`Delete "${ticket.title}"?`))) return;

    try {
      setDeleting(true);
      await deleteTicket(ticket.id);
      toast.success("Ticket deleted.");
      onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-fg">
            Edit Ticket
            {ticket.ticket_no && (
              <span className="ml-2 font-mono text-sm font-semibold text-fg-subtle">
                {ticket.ticket_no}
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs text-fg-subtle">
          Created by {ticket.created_by_username || "Unknown"} on{" "}
          {ticket.created_at
            ? new Date(ticket.created_at).toLocaleDateString()
            : "--"}
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-subtle">
              Title
            </label>
            <input
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-fg-subtle">
              Description
            </label>
            <textarea
              rows={5}
              className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-fg-subtle">
              Image
            </label>
            {imageUrl ? (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt=""
                  onClick={() => setPreviewOpen(true)}
                  className="h-32 w-full cursor-zoom-in rounded-xl border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={uploadingImage}
                  className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/80 disabled:opacity-50"
                >
                  ✕
                </button>
                {previewOpen && (
                  <ImagePreviewOverlay
                    url={imageUrl}
                    onClose={() => setPreviewOpen(false)}
                  />
                )}
              </div>
            ) : (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={uploadingImage}
                onChange={handleImageChange}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-fg file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground disabled:opacity-50"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-subtle">
                Status
              </label>
              <SearchSelect
                value={COLUMNS.find((column) => column.key === status) || null}
                options={COLUMNS}
                onChange={(column) => setStatus(column?.key ?? "")}
                getOptionValue={(column) => column.key}
                placeholder="Select status"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-fg-subtle">
                Priority
              </label>
              <SearchSelect
                value={
                  [
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ].find((option) => option.value === priority) || null
                }
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
                onChange={(option) => setPriority(option?.value ?? "")}
                placeholder="No priority"
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-fg-subtle">
                Assigned to (IT)
              </label>
              <SearchSelect
                value={users.find((u) => String(u.id) === String(assigneeId))}
                options={users}
                onChange={(u) => u && setAssigneeId(u.id)}
                placeholder="Select IT employee"
                getOptionLabel={(u) => u?.employee_name || u?.username || ""}
                getOptionValue={(u) => u?.id}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="rounded-xl border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
