
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Inbox,
  Layers3,
  LoaderCircle,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  Wallet,
  MapPin,
  Handshake,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import "./App.css";

const API = `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001"}/api/memories`;

function formatDate(value, withTime = false) {
  if (!value) return "No due date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString(
    "en-IN",
    withTime
      ? {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
  );
}

function isOverdue(memory, now = new Date()) {
  if (memory.status !== "pending" || !memory.due_at) return false;

  const due = new Date(memory.due_at);

  return !Number.isNaN(due.getTime()) && due < now;
}

function categoryLabel(category) {
  const labels = {
    item: "Items",
    people: "People",
    money: "Money",
    promise: "Promises",
    place: "Places",
    time: "Time",
    follow_up: "Follow-ups",
    other: "General notes",
  };

  return (
    labels[category] ||
    (category ? category.replaceAll("_", " ") : "General notes")
  );
}

function categoryIcon(category) {
  if (category === "item") return <Layers3 size={18} />;
  if (category === "people") return <Handshake size={18} />;
  if (category === "money") return <Wallet size={18} />;
  if (category === "promise") return <Sparkles size={18} />;
  if (category === "place") return <MapPin size={18} />;

  if (category === "time" || category === "follow_up") {
    return <CalendarDays size={18} />;
  }

  return <Inbox size={18} />;
}

function App() {
  const [memories, setMemories] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeNav, setActiveNav] = useState("All memories");

  const loadMemories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Unexpected memories response.");
      }

      setMemories(data);
    } catch {
      setError(
        "Couldn't connect to LifeLoop. Check that your backend is running on port 8001."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const now = new Date();

  const activeMemories = memories.filter(
    (memory) => memory.status !== "archived"
  );

  const pendingAll = activeMemories.filter(
    (memory) => memory.status === "pending"
  );

  const overdue = pendingAll.filter((memory) => isOverdue(memory, now));

  const pending = pendingAll.filter(
    (memory) => !isOverdue(memory, now)
  );

  const completed = activeMemories.filter(
    (memory) => memory.status === "completed"
  );

  const archived = memories.filter(
    (memory) => memory.status === "archived"
  );

  const reminded = memories.filter(
    (memory) => Boolean(memory.reminder_sent_at)
  );

  const withDueDate = activeMemories.filter(
    (memory) => Boolean(memory.due_at)
  );

  const categoryData = useMemo(() => {
    const counts = {};

    activeMemories.forEach((memory) => {
      const key = memory.category || "other";
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([key, count]) => ({
        key,
        label: categoryLabel(key),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [activeMemories]);

  const statusData = [
    {
      key: "pending",
      label: "Pending",
      count: pending.length,
      color: "pending",
    },
    {
      key: "overdue",
      label: "Overdue",
      count: overdue.length,
      color: "overdue",
    },
    {
      key: "completed",
      label: "Completed",
      count: completed.length,
      color: "completed",
    },
  ];

  const maxStatus = Math.max(
    1,
    ...statusData.map((item) => item.count)
  );

  const totalActive = activeMemories.length;

  const completionRate = totalActive
    ? Math.round((completed.length / totalActive) * 100)
    : 0;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return memories
      .filter((memory) => {
        const searchableFields = [
          memory.title,
          memory.raw_text,
          memory.person_name,
          memory.item_name,
          memory.category,
          memory.location,
        ];

        const matchesSearch =
          !term ||
          searchableFields
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(term)
            );

        let matchesStatus = true;

        if (filter === "pending") {
          matchesStatus =
            memory.status === "pending" && !isOverdue(memory);
        }

        if (filter === "completed") {
          matchesStatus = memory.status === "completed";
        }

        if (filter === "overdue") {
          matchesStatus = isOverdue(memory);
        }

        if (filter === "reminded") {
          matchesStatus = Boolean(memory.reminder_sent_at);
        }

        if (filter === "archived") {
          matchesStatus = memory.status === "archived";
        }

        if (categoryFilter !== "all") {
          matchesStatus =
            matchesStatus &&
            (memory.category || "other") === categoryFilter;
        }

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const aDue = a.due_at
          ? new Date(a.due_at).getTime()
          : Infinity;

        const bDue = b.due_at
          ? new Date(b.due_at).getTime()
          : Infinity;

        return aDue - bDue;
      });
  }, [memories, search, filter, categoryFilter]);

  async function captureMemory(event) {
    event.preventDefault();

    if (!text.trim()) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Couldn't save this memory.");
      }

      setText("");

      setNotice(
        data.due_at
          ? "Memory captured with a reminder date."
          : "Memory captured. No reminder date was detected."
      );

      await loadMemories();
    } catch (err) {
      setError(err.message || "Unable to save memory.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(memory, status) {
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/${memory.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Couldn't update this memory.");
      }

      setNotice(
        status === "completed"
          ? "Memory marked completed."
          : "Memory archived."
      );

      await loadMemories();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteMemory(memory) {
    if (!window.confirm(`Delete "${memory.title}" permanently?`)) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/${memory.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Couldn't delete this memory.");
      }

      setNotice("Memory deleted.");

      await loadMemories();
    } catch (err) {
      setError(err.message);
    }
  }

  function selectFilter(value, label) {
    setFilter(value);
    setActiveNav(label);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            selectFilter("all", "All memories");
          }}
        >
          <span className="brand-mark">
            <Layers3 size={22} />
          </span>
          <span>
            lifeloop<span className="brand-period">.</span>
          </span>
        </a>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="nav-list">
          <button
            className={
              activeNav === "All memories"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => selectFilter("all", "All memories")}
          >
            <Inbox size={18} /> All memories
            <span className="nav-count">{memories.length}</span>
          </button>

          <button
            className={
              activeNav === "Pending" ? "nav-item active" : "nav-item"
            }
            onClick={() => selectFilter("pending", "Pending")}
          >
            <Clock3 size={18} /> Pending
            <span className="nav-count">{pending.length}</span>
          </button>

          <button
            className={
              activeNav === "Completed"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => selectFilter("completed", "Completed")}
          >
            <CheckCircle2 size={18} /> Completed
            <span className="nav-count">{completed.length}</span>
          </button>

          <button
            className={
              activeNav === "Overdue" ? "nav-item active" : "nav-item"
            }
            onClick={() => selectFilter("overdue", "Overdue")}
          >
            <Activity size={18} /> Overdue
            <span className="nav-count alert-count">
              {overdue.length}
            </span>
          </button>

          <button
            className={
              activeNav === "Email reminders"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => selectFilter("reminded", "Email reminders")}
          >
            <Mail size={18} /> Email reminders
            <span className="nav-count">{reminded.length}</span>
          </button>

          <button
            className={
              activeNav === "Archived" ? "nav-item active" : "nav-item"
            }
            onClick={() => selectFilter("archived", "Archived")}
          >
            <Archive size={18} /> Archived
            <span className="nav-count">{archived.length}</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">
              <Sparkles size={17} />
            </span>
            <p>Your mind is for having ideas, not holding them.</p>
            <span className="tip-caption">LET LIFE LOOP BACK</span>
          </div>

          <div className="connection">
            <span className="connection-dot" /> Local workspace
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{activeNav}</strong>
          </div>

          <div className="topbar-right">
            <span className="local-badge">
              <span /> Local API
            </span>

            <button
              className="icon-button"
              title="Refresh memories"
              onClick={loadMemories}
            >
              <RefreshCw size={17} />
            </button>

            <div className="avatar">H</div>
          </div>
        </header>

        <div className="page-container">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <Sparkles size={14} /> YOUR PERSONAL MEMORY SPACE
              </div>

              <h1>
                Keep life <span>in the loop.</span>
              </h1>

              <p className="welcome-description">
                The little things matter. Keep track of them, without
                keeping them all in your head.
              </p>
            </div>

            <div className="date-chip">
              <Clock3 size={15} />{" "}
              {now.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </div>
          </section>

          <section className="stats-grid">
            <StatCard
              label="Total memories"
              value={memories.length}
              foot="Everything you've captured"
              icon={<Layers3 size={18} />}
              tone="lavender"
            />

            <StatCard
              label="Pending"
              value={pending.length}
              foot="Not yet due"
              icon={<Clock3 size={18} />}
              tone="amber"
            />

            <StatCard
              label="Overdue"
              value={overdue.length}
              foot={
                overdue.length
                  ? "Needs your attention"
                  : "You're all caught up"
              }
              icon={<Bell size={18} />}
              tone="rose"
            />

            <StatCard
              label="Completed"
              value={completed.length}
              foot={`${completionRate}% of active memories`}
              icon={<Check size={18} />}
              tone="mint"
            />
          </section>

          <section className="analytics-grid">
            <div className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">YOUR MEMORY MIX</div>
                  <h2>By category</h2>
                  <p>How your saved memories are organized.</p>
                </div>

                <span className="panel-icon">
                  <Layers3 size={18} />
                </span>
              </div>

              {categoryData.length === 0 ? (
                <ChartEmpty />
              ) : (
                <div className="category-chart">
                  <div className="donut-wrap">
                    <div
                      className="donut"
                      style={{
                        background: `conic-gradient(${categoryData
                          .map((item, index) => {
                            const colors = [
                              "#7565d8",
                              "#e8b65c",
                              "#e27f91",
                              "#56b995",
                              "#6da5e8",
                              "#9d82cf",
                              "#d49b70",
                              "#b6b4c6",
                            ];

                            const start =
                              (categoryData
                                .slice(0, index)
                                .reduce((sum, item) => sum + item.count, 0) /
                                Math.max(1, totalActive)) *
                              100;

                            const end =
                              start +
                              (item.count / Math.max(1, totalActive)) * 100;

                            return `${colors[index % colors.length]} ${start}% ${end}%`;
                          })
                          .join(", ")})`,
                      }}
                    >
                      <div className="donut-hole">
                        <strong>{totalActive}</strong>
                        <span>memories</span>
                      </div>
                    </div>
                  </div>

                  <div className="category-legend">
                    {categoryData.map((item, index) => (
                      <div className="legend-row" key={item.key}>
                        <span className={`legend-dot dot-${index % 8}`} />
                        <span className="legend-label">{item.label}</span>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">FOLLOW-THROUGH</div>
                  <h2>Status overview</h2>
                  <p>Pending, overdue and completed memories.</p>
                </div>

                <span className="panel-icon">
                  <BarChart3 size={18} />
                </span>
              </div>

              <div className="status-chart">
                {statusData.map((item) => (
                  <div className="bar-row" key={item.key}>
                    <div className="bar-label">
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>

                    <div className="bar-track">
                      <div
                        className={`bar-fill bar-${item.color}`}
                        style={{
                          width: `${(item.count / maxStatus) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="chart-foot">
                <span>
                  <span className="footer-dot" /> {completionRate}%
                  completion rate
                </span>
                <span>{withDueDate.length} with due dates</span>
              </div>
            </div>
          </section>

          <section className="capture-card">
            <div className="capture-heading">
              <div className="capture-icon">
                <Sparkles size={21} />
              </div>

              <div>
                <h2>Get it out of your head.</h2>
                <p>Write naturally. LifeLoop will organize the details.</p>
              </div>

              <span className="capture-label">
                <Sparkles size={13} /> QUICK CAPTURE
              </span>
            </div>

            <form onSubmit={captureMemory}>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="e.g. I lent Rahul my calculator. Remind me to collect it next week..."
                rows={3}
              />

              <div className="capture-footer">
                <span className="input-hint">
                  Tip: include a reminder like “in 5 minutes” or “tomorrow”.
                </span>

                <button
                  className="primary-button"
                  disabled={saving || !text.trim()}
                >
                  {saving ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Plus size={17} />
                  )}

                  {saving ? "Saving..." : "Capture memory"}
                </button>
              </div>
            </form>
          </section>

          {(error || notice) && (
            <div
              className={
                error
                  ? "feedback error-feedback"
                  : "feedback success-feedback"
              }
            >
              {error ? <X size={17} /> : <CheckCircle2 size={17} />}

              <span>{error || notice}</span>

              {error && (
                <button onClick={() => setError("")}>
                  <X size={15} />
                </button>
              )}
            </div>
          )}

          <section className="memories-section">
            <div className="section-header">
              <div>
                <div className="eyebrow">YOUR COLLECTION</div>
                <h2>{activeNav}</h2>
                <p>All the small things, in one place.</p>
              </div>

              <div className="search-box">
                <Search size={17} />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search memories..."
                />

                <kbd>⌘ K</kbd>
              </div>
            </div>

            <div className="filter-row">
              {[
                ["all", "All memories"],
                ["pending", "Pending"],
                ["overdue", "Overdue"],
                ["completed", "Completed"],
                ["reminded", "Email sent"],
                ["archived", "Archived"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={
                    filter === value
                      ? "filter-chip selected"
                      : "filter-chip"
                  }
                  onClick={() =>
                    selectFilter(
                      value,
                      value === "reminded" ? "Email reminders" : label
                    )
                  }
                >
                  {label}
                </button>
              ))}

              <span className="results-count">
                {filtered.length} memories
              </span>
            </div>

            <div className="secondary-filters">
              <label htmlFor="category-filter">Category</label>

              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="all">All categories</option>

                {categoryData.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="empty-state">
                <LoaderCircle className="spin" size={25} />
                <p>Loading your memories...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Inbox size={25} />
                </div>
                <h3>Nothing here just yet</h3>
                <p>Capture a memory above, or try another search.</p>
              </div>
            ) : (
              <div className="memory-list">
                {filtered.map((memory) => {
                  const overdueFlag = isOverdue(memory);

                  return (
                    <article className="memory-card" key={memory.id}>
                      <div
                        className={`memory-category category-${memory.category || "other"}`}
                      >
                        {categoryIcon(memory.category)}
                      </div>

                      <div className="memory-body">
                        <div className="memory-title-row">
                          <h3>{memory.title}</h3>

                          <span
                            className={`status-pill status-${memory.status}`}
                          >
                            {memory.status}
                          </span>

                          {overdueFlag && (
                            <span className="status-pill status-overdue">
                              overdue
                            </span>
                          )}
                        </div>

                        <p className="memory-original">{memory.raw_text}</p>

                        <div className="memory-meta">
                          <span className="category-label">
                            {categoryLabel(memory.category)}
                          </span>

                          {memory.person_name && (
                            <span>
                              <span className="meta-label">PERSON</span>{" "}
                              {memory.person_name}
                            </span>
                          )}

                          {memory.item_name && (
                            <span>
                              <span className="meta-label">ITEM</span>{" "}
                              {memory.item_name}
                            </span>
                          )}

                          {memory.amount != null && (
                            <span>
                              <span className="meta-label">AMOUNT</span> ₹
                              {Number(memory.amount).toLocaleString("en-IN")}
                            </span>
                          )}

                          {memory.location && (
                            <span>
                              <MapPin size={13} /> {memory.location}
                            </span>
                          )}

                          {memory.due_at && (
                            <span>
                              <Clock3 size={13} /> Due{" "}
                              {formatDate(memory.due_at, true)}
                            </span>
                          )}
                        </div>

                        <div className="reminder-status">
                          <Mail size={13} />

                          {memory.reminder_sent_at
                            ? `Email sent ${formatDate(memory.reminder_sent_at, true)}`
                            : memory.due_at
                              ? overdueFlag
                                ? "Reminder due — check email status"
                                : "Reminder scheduled"
                              : "No reminder date"}
                        </div>
                      </div>

                      <div className="memory-actions">
                        {memory.status === "pending" && (
                          <button
                            className="action-button complete-action"
                            title="Mark completed"
                            onClick={() => updateStatus(memory, "completed")}
                          >
                            <Check size={16} />
                          </button>
                        )}

                        {memory.status !== "archived" && (
                          <button
                            className="action-button"
                            title="Archive"
                            onClick={() => updateStatus(memory, "archived")}
                          >
                            <Archive size={16} />
                          </button>
                        )}

                        <button
                          className="action-button delete-action"
                          title="Delete memory"
                          onClick={() => deleteMemory(memory)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <footer className="page-footer">
            <span>
              <span className="footer-dot" /> LifeLoop is running locally
            </span>
            <span>Made for the things worth remembering.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, foot, icon, tone }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>

      <div className="stat-number">{value}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="chart-empty">
      <div className="empty-icon">
        <BarChart3 size={22} />
      </div>
      <p>Capture your first memory to see category insights.</p>
    </div>
  );
}

export default App;
