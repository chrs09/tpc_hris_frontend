import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Forward, Globe, History, MessageSquare, Search, Settings2, X } from "lucide-react";
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
  getTicketCategories,
  saveTicketCategory,
  forwardTicket,
  getTicketComments,
  addTicketComment,
  deleteTicketComment,
} from "../../api/tickets";
import { usePageCanEdit } from "../../hooks/usePageCanEdit";
import SearchInput from "../../components/ui/searchInput/SearchInput";
import { matchesSearch } from "../../utils/search";

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
  const canEditPage = usePageCanEdit();
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  // Per-column search (To Do / In Progress / Review / Done), on top of
  // the page-wide one above.
  const [columnSearch, setColumnSearch] = useState({});
  const [loading, setLoading] = useState(true);
  const [draggingTicket, setDraggingTicket] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [users, setUsers] = useState([]);
  // Categories route tickets to an Org Chart unit (team).
  const [categories, setCategories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [seesAll, setSeesAll] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(null);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getTicketCategories(true);
      setCategories(data.categories || []);
      setTeams(data.teams || []);
      setCanManage(Boolean(data.can_manage));
    } catch {
      setCategories([]);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTickets();
      setTickets(data.tickets || []);
      setSeesAll(Boolean(data.sees_all));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    loadCategories();
    // Anyone active can be assigned a ticket.
    getTicketAssignees()
      .then((data) => setUsers(data))
      .catch(() => setUsers([]));
  }, [loadTickets, loadCategories]);

  const activeCategories = categories.filter((c) => c.is_active);

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
      <SectionTabs group="Tickets" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-fg">Tickets</h2>
          <p className="text-sm text-fg-subtle">
            Each ticket goes to the team for its category (set on the Org
            Chart). {seesAll
              ? "You see every ticket."
              : "You see tickets you filed, tickets assigned to you, and your team's tickets."}{" "}
            Customers can file tickets at <span className="font-mono">/support</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search ticket no., title, person, store..."
        />
        <div className="w-48">
          <SearchSelect
            value={categoryFilter}
            options={[{ id: null, name: "All categories" }, ...activeCategories]}
            onChange={(c) => setCategoryFilter(c?.id ? c : null)}
            getOptionLabel={(c) => c?.name || ""}
            getOptionValue={(c) => c?.id ?? "all"}
            placeholder="All categories"
          />
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCategories(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-fg hover:bg-surface-hover"
          >
            <Settings2 size={15} />
            Categories
          </button>
        )}
        {canEditPage && (
          <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          + New Ticket
        </button>
        )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-fg-subtle">
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const inColumn = tickets.filter(
              (t) =>
                t.status === column.key &&
                (!categoryFilter || t.category_id === categoryFilter.id),
            );
            const columnQuery = columnSearch[column.key] || "";
            const columnTickets = inColumn.filter(
              (t) =>
                matchesSearch(
                  columnQuery,
                  t.ticket_no,
                  t.title,
                  t.description,
                  t.priority,
                  t.created_by_username,
                  t.assigned_to_username,
                  t.category_name,
                  t.requester?.company,
                ) &&
                matchesSearch(
                  search,
                  t.ticket_no,
                  t.title,
                  t.description,
                  t.priority,
                  t.created_by_username,
                  t.assigned_to_username,
                  t.category_name,
                  t.requester?.company,
                ),
            );

            return (
              <div
                key={column.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(column.key);
                }}
                // Fixed height: the header and search stay put, the cards
                // scroll inside the column.
                className="flex h-[70vh] min-h-[420px] flex-col gap-3 rounded-2xl border border-border bg-surface-hover/50 p-3 xl:h-[calc(100vh-260px)]"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-fg">
                    {column.label}
                  </h3>
                  <span className="text-xs text-fg-subtle">
                    {columnTickets.length === inColumn.length
                      ? inColumn.length
                      : `${columnTickets.length} of ${inColumn.length}`}
                  </span>
                </div>

                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
                  />
                  <input
                    value={columnQuery}
                    onChange={(e) =>
                      setColumnSearch((prev) => ({
                        ...prev,
                        [column.key]: e.target.value,
                      }))
                    }
                    placeholder={`Search ${column.label}...`}
                    className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-7 text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                  {columnQuery && (
                    <button
                      type="button"
                      onClick={() =>
                        setColumnSearch((prev) => ({ ...prev, [column.key]: "" }))
                      }
                      aria-label="Clear search"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-fg-subtle hover:text-fg"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="-mr-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {columnTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-fg-subtle">
                    {inColumn.length ? "No tickets match." : "No tickets here."}
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
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateTicketModal
          users={users}
          categories={activeCategories}
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
          categories={activeCategories}
          seesAll={seesAll}
          onClose={() => setSelectedTicket(null)}
          onChanged={() => {
            setSelectedTicket(null);
            loadTickets();
          }}
          onImageChanged={loadTickets}
          onCommentsChanged={loadTickets}
        />
      )}

      {showCategories && (
        <CategoriesModal
          categories={categories}
          teams={teams}
          onClose={() => setShowCategories(false)}
          onSaved={loadCategories}
        />
      )}
    </div>
  );
}

const TicketCard = ({ ticket, onDragStart, onClick }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  // View-only: cards can't be dragged to another column.
  const canDrag = usePageCanEdit();

  return (
    <div
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onClick={onClick}
      className="cursor-grab rounded-xl border border-border bg-surface p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        {ticket.ticket_no && (
          <span className="font-mono text-[10px] font-semibold tracking-wide text-fg-subtle">
            {ticket.ticket_no}
          </span>
        )}
        {ticket.category_name && (
          <span className="rounded-full bg-surface-active px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
            {ticket.category_name}
          </span>
        )}
        {ticket.source === "public" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Globe size={10} />
            Customer
          </span>
        )}
      </div>
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
        <span className="flex items-center gap-2">
          By {ticket.created_by_username || "Unknown"}
          {ticket.requester?.company ? ` · ${ticket.requester.company}` : ""}
          {ticket.comment_count > 0 && (
            <span
              className="flex items-center gap-0.5"
              title={`${ticket.comment_count} comment(s)`}
            >
              <MessageSquare size={11} />
              {ticket.comment_count}
            </span>
          )}
        </span>
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

const CreateTicketModal = ({ users = [], categories = [], onClose, onCreated }) => {
  const [categoryId, setCategoryId] = useState(null);
  const [assigneeId, setAssigneeId] = useState(null);
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
    if (!categoryId) {
      toast.error("Pick a category.");
      return;
    }
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
        category_id: categoryId,
        assigned_to_user_id: assigneeId || undefined,
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
              Category
            </label>
            <SearchSelect
              value={categories.find((c) => c.id === categoryId) || null}
              options={categories}
              onChange={(c) => setCategoryId(c?.id ?? null)}
              getOptionLabel={(c) =>
                c ? `${c.name}${c.team_name ? ` → ${c.team_name}` : ""}` : ""
              }
              getOptionValue={(c) => c?.id}
              placeholder="What is this about?"
            />
          </div>

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
                Assign to (optional)
              </label>
              <SearchSelect
                value={users.find((u) => u.id === assigneeId) || null}
                options={users}
                onChange={(u) => setAssigneeId(u?.id ?? null)}
                getOptionLabel={(u) => u?.employee_name || u?.username || ""}
                getOptionValue={(u) => u?.id}
                placeholder={(() => {
                  const team = categories.find((c) => c.id === categoryId)?.team_name;
                  return team ? `Auto: ${team} team` : "Auto: category's team";
                })()}
              />
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
  categories = [],
  seesAll = false,
  onCommentsChanged,
  onClose,
  onChanged,
  onImageChanged,
}) => {
  const canEditPage = usePageCanEdit();
  const scrollRef = useRef(null);
  // After posting, bring the new comment into view.
  const thread = useTicketComments(ticket, onCommentsChanged, () =>
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }),
  );
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description || "");
  const [priority, setPriority] = useState(ticket.priority || "");
  const [status, setStatus] = useState(ticket.status);
  const [assigneeId, setAssigneeId] = useState(
    ticket.assigned_to_user_id ? String(ticket.assigned_to_user_id) : "",
  );
  const [categoryId, setCategoryId] = useState(ticket.category_id || null);
  const [showForward, setShowForward] = useState(false);
  // Delete: the person who filed it, or anyone who sees every ticket.
  const canDelete =
    seesAll || String(ticket.created_by_user_id) === localStorage.getItem("user_id");
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
        ...(assigneeId ? { assigned_to_user_id: Number(assigneeId) } : {}),
        ...(categoryId ? { category_id: categoryId } : {}),
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
      {/* Fixed height: title bar and comment box stay put, the middle
          (details + comment thread) scrolls -- like a Facebook post. */}
      <div className="flex h-[88vh] max-h-[860px] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        <p className="mb-4 text-xs text-fg-subtle">
          Created by {ticket.created_by_username || "Unknown"} on{" "}
          {ticket.created_at
            ? new Date(ticket.created_at).toLocaleDateString()
            : "--"}
          {ticket.team_name ? ` · Team: ${ticket.team_name}` : ""}
        </p>

        {ticket.requester && (
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Globe size={13} />
              From a customer (support form)
            </p>
            <p className="text-fg">
              {ticket.requester.name}
              {ticket.requester.company ? ` · ${ticket.requester.company}` : ""}
            </p>
            <p className="text-xs text-fg-muted">
              {[ticket.requester.phone, ticket.requester.email].filter(Boolean).join(" · ")}
            </p>
          </div>
        )}

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

            <div>
              <label className="mb-1 block text-xs font-medium text-fg-subtle">
                Category
              </label>
              <SearchSelect
                value={categories.find((c) => c.id === categoryId) || null}
                options={categories}
                onChange={(c) => c && setCategoryId(c.id)}
                getOptionLabel={(c) => c?.name || ""}
                getOptionValue={(c) => c?.id}
                placeholder="Select category"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-fg-subtle">
                Assigned to
              </label>
              <SearchSelect
                value={users.find((u) => String(u.id) === String(assigneeId))}
                options={users}
                onChange={(u) => u && setAssigneeId(u.id)}
                placeholder="Select person"
                getOptionLabel={(u) => u?.employee_name || u?.username || ""}
                getOptionValue={(u) => u?.id}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
          {canEditPage && (
            <button
              type="button"
              onClick={() => setShowForward(true)}
              disabled={deleting || saving}
              className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-hover disabled:opacity-50"
            >
              <Forward size={15} />
              Forward
            </button>
          )}
          {canEditPage && canDelete && (
            <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="rounded-xl border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
            {canEditPage && (
              <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            )}
          </div>
        </div>

        <TicketTimeline history={ticket.history} />

        <CommentThread thread={thread} />
        </div>

        <div className="shrink-0 border-t border-border bg-surface px-6 py-3">
          {canEditPage ? (
            <CommentComposer thread={thread} isPublic={ticket.source === "public"} />
          ) : (
            <p className="text-center text-xs text-fg-subtle">
              View only -- you can read comments but not post.
            </p>
          )}
        </div>
      </div>

      {showForward && (
        <ForwardModal
          ticket={ticket}
          users={users}
          categories={categories}
          onClose={() => setShowForward(false)}
          onForwarded={() => {
            setShowForward(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
};

// Ticket comments: the creator adds remarks or follow-ups, the handler replies.
// Saved immediately (separate from the ticket's Save button). Each person
// can delete only their own comments. The thread scrolls with the ticket
// details; the composer is pinned at the bottom of the window.
const useTicketComments = (ticket, onChanged, onPosted) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTicketComments(ticket.id)
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch((error) => {
        if (!cancelled) toast.error(getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticket.id]);

  const post = async (toCustomer = false) => {
    const text = body.trim();
    if (!text) return;
    try {
      setPosting(true);
      const comment = await addTicketComment(ticket.id, text, toCustomer);
      setComments((prev) => [...prev, comment]);
      setBody("");
      onChanged?.();
      onPosted?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPosting(false);
    }
  };

  const remove = async (comment) => {
    if (!(await confirmDialog("Delete this comment?"))) return;
    try {
      await deleteTicketComment(ticket.id, comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      onChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return { comments, loading, body, setBody, posting, post, remove };
};

const CommentThread = ({ thread }) => {
  const { comments, loading, remove } = thread;

  return (
    <section className="mt-6 border-t border-border pt-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
        <MessageSquare size={15} />
        Comments {comments.length > 0 && `(${comments.length})`}
      </h4>

      {loading ? (
        <p className="text-xs text-fg-subtle">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-fg-subtle">
          No comments yet. Add remarks or follow-ups below.
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className={`rounded-xl border p-3 text-sm ${
                comment.is_mine
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-surface-hover"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                  {comment.user_name || "Unknown"}
                  {comment.is_creator && (
                    <span className="rounded-full bg-surface-active px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">
                      Creator
                    </span>
                  )}
                  {comment.to_customer && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Sent to customer
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-[11px] text-fg-subtle">
                  {comment.created_at
                    ? new Date(comment.created_at + "Z").toLocaleString()
                    : ""}
                  {comment.is_mine && (
                    <button
                      type="button"
                      onClick={() => remove(comment)}
                      className="text-fg-subtle hover:text-danger"
                      aria-label="Delete comment"
                      title="Delete comment"
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-fg-muted">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const CommentComposer = ({ thread, isPublic = false }) => {
  const { body, setBody, posting, post } = thread;
  // Public tickets: optionally email this reply to the customer.
  const [toCustomer, setToCustomer] = useState(false);
  const send = () => post(isPublic && toCustomer);

  return (
    <div className="space-y-2">
    {isPublic && (
      <label className="flex items-center gap-2 text-xs text-fg-muted">
        <input
          type="checkbox"
          checked={toCustomer}
          onChange={(e) => setToCustomer(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Send to customer (emailed and shown on their status page)
      </label>
    )}
    <div className="flex items-end gap-2">
      <textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Write a comment... (Ctrl+Enter to post)"
        className="max-h-32 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      />
      <button
        type="button"
        onClick={send}
        disabled={posting || !body.trim()}
        className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {posting ? "Posting..." : isPublic && toCustomer ? "Send" : "Post"}
      </button>
    </div>
    </div>
  );
};

const HISTORY_TEXT = {
  created: (h) =>
    `${h.by} filed it${h.category ? ` under ${h.category}` : ""}${
      h.assigned_to ? `, assigned to ${h.assigned_to}` : ""
    }`,
  forwarded: (h) =>
    `${h.by} forwarded it${h.category ? ` to ${h.category}` : ""}${
      h.assigned_to ? ` (${h.assigned_to})` : ""
    }`,
  assigned: (h) => `${h.by} assigned it to ${h.assigned_to}`,
  category: (h) => `${h.by} changed the category to ${h.to}`,
  status: (h) => `${h.by} moved it from ${h.frm} to ${h.to}`,
};

// Who did what: filed, assigned, forwarded, status changes.
const TicketTimeline = ({ history = [] }) => {
  if (!history.length) return null;
  return (
    <section className="mt-6 border-t border-border pt-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
        <History size={15} />
        Timeline
      </h4>
      <ol className="space-y-2 border-l border-border pl-4">
        {history.map((h, index) => (
          <li key={`${h.at}-${index}`} className="text-xs">
            <p className="text-fg">
              {(HISTORY_TEXT[h.action] || ((x) => `${x.by}: ${x.action}`))(h)}
            </p>
            {h.note && <p className="mt-0.5 italic text-fg-muted">“{h.note}”</p>}
            <p className="text-[11px] text-fg-subtle">
              {h.at ? new Date(`${h.at}Z`).toLocaleString() : ""}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
};

// Hand the ticket to another team (category) and/or person, with a note.
const ForwardModal = ({ ticket, users = [], categories = [], onClose, onForwarded }) => {
  const [categoryId, setCategoryId] = useState(null);
  const [assigneeId, setAssigneeId] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const team = categories.find((c) => c.id === categoryId)?.team_name;

  const submit = async () => {
    if (!categoryId && !assigneeId) {
      toast.error("Pick a category or a person.");
      return;
    }
    if (!note.trim()) {
      toast.error("Say why you're forwarding it.");
      return;
    }
    try {
      setSaving(true);
      await forwardTicket(ticket.id, {
        category_id: categoryId || undefined,
        assigned_to_user_id: assigneeId || undefined,
        note: note.trim(),
      });
      toast.success("Ticket forwarded.");
      onForwarded();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-fg">Forward {ticket.ticket_no}</h3>
          <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg">
            ✕
          </button>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-subtle">
            To category (team)
          </label>
          <SearchSelect
            value={categories.find((c) => c.id === categoryId) || null}
            options={categories.filter((c) => c.id !== ticket.category_id)}
            onChange={(c) => setCategoryId(c?.id ?? null)}
            getOptionLabel={(c) =>
              c ? `${c.name}${c.team_name ? ` → ${c.team_name}` : ""}` : ""
            }
            getOptionValue={(c) => c?.id}
            placeholder={`Keep ${ticket.category_name || "category"}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-subtle">
            To person (optional)
          </label>
          <SearchSelect
            value={users.find((u) => u.id === assigneeId) || null}
            options={users}
            onChange={(u) => setAssigneeId(u?.id ?? null)}
            getOptionLabel={(u) => u?.employee_name || u?.username || ""}
            getOptionValue={(u) => u?.id}
            placeholder={team ? `Auto: ${team} team` : "Auto: the team picks"}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-subtle">Note</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. This is a system bug -- the app crashes on Checkout."
            className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
        <div className="flex justify-end gap-2">
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
            onClick={submit}
            disabled={saving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Forwarding..." : "Forward"}
          </button>
        </div>
      </div>
    </div>
  );
};

const EMPTY_CATEGORY = {
  name: "",
  description: "",
  org_unit_id: null,
  is_public: false,
  is_active: true,
  sort_order: 0,
};

// Ticket categories: what a ticket is about, which Org Chart unit
// handles it, and whether customers can pick it on /support.
const CategoriesModal = ({ categories = [], teams = [], onClose, onSaved }) => {
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!editing.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    try {
      setSaving(true);
      await saveTicketCategory({ ...editing, name: editing.name.trim() });
      toast.success("Category saved.");
      setEditing(null);
      onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-fg">Ticket categories</h3>
            <p className="text-xs text-fg-subtle">
              Each category goes to an Org Chart unit. Public ones show on the customer
              support form.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {categories.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between gap-3 rounded-xl border border-border p-3 ${
                c.is_active ? "" : "opacity-60"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">
                  {c.name}
                  {c.is_public && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Public
                    </span>
                  )}
                  {!c.is_active && (
                    <span className="ml-2 rounded-full bg-surface-active px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
                      Hidden
                    </span>
                  )}
                </p>
                <p className="text-xs text-fg-muted">
                  → {c.team_name || "No team (unassigned)"}
                  {c.description ? ` · ${c.description}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing({ ...EMPTY_CATEGORY, ...c, description: c.description || "" })}
                className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-hover"
              >
                Edit
              </button>
            </div>
          ))}

          {editing ? (
            <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-fg">
                {editing.id ? `Edit ${editing.name || "category"}` : "New category"}
              </p>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Name, e.g. Trip / Delivery"
                className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-fg"
              />
              <input
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Short description (shown to customers if public)"
                className="w-full rounded-xl border border-border bg-background p-2.5 text-sm text-fg"
              />
              <SearchSelect
                value={teams.find((t) => t.id === editing.org_unit_id) || null}
                options={teams}
                onChange={(t) => setEditing({ ...editing, org_unit_id: t?.id ?? null })}
                getOptionLabel={(t) => t?.name || ""}
                getOptionValue={(t) => t?.id}
                placeholder="Handled by (Org Chart unit)"
              />
              <div className="flex flex-wrap gap-4 text-sm text-fg">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editing.is_public}
                    onChange={(e) => setEditing({ ...editing, is_public: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  Customers can pick it
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  Active
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-xl border border-border px-4 py-2 text-sm text-fg-muted hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing({ ...EMPTY_CATEGORY, sort_order: categories.length })}
              className="w-full rounded-xl border border-dashed border-border py-3 text-sm font-medium text-fg-muted hover:bg-surface-hover"
            >
              + Add category
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
