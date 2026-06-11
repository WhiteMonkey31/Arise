import React from "react";
import { useWorkspaceStore } from "../store/workspaceStore";
import SectorBadge from "../components/ui/SectorBadge";
import DeadlineChip from "../components/ui/DeadlineChip";
import { Link } from "react-router";
import { toastSuccess } from "../components/ui/ToastProvider";

export default function Portfolio() {
  const { workspaces, updateWorkspaceStatus } = useWorkspaceStore();
  const [draggingId, setDraggingId] = React.useState(null);

  const columns = ["Draft", "Analysing", "In Review", "Submitted"];

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("workspaceId", id);
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    setDraggingId(null);
    const id = e.dataTransfer.getData("workspaceId");
    if (id) {
      updateWorkspaceStatus(id, targetStatus);
      toastSuccess(`RFP moved to ${targetStatus}`);
    }
  };

  const getUrgentDeadlineHighlight = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 4; // Mark 4 days or less as urgent countdown indicator
  };

  return (
    <div className="space-y-6 fade-in select-none">
      {/* Page Header */}
      <div>
        <h2 className="font-serif font-bold text-2xl text-(--text) tracking-tight">
          RFP Kanban Board
        </h2>
        <p className="text-xs text-(--muted) mt-1 font-medium font-sans">
          Drag and drop cards across stages to track proposal progress. Close
          deadlines are highlighted.
        </p>
      </div>

      {/* Board Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {columns.map((column) => {
          const items = workspaces.filter((w) => w.status === column);
          return (
            <div
              key={column}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, column)}
              className="rounded-3xl border border-(--border) bg-(--surface) p-4 shadow-xs min-h-125 flex flex-col gap-3 transition-colors duration-200"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-(--border) pb-3 px-1.5 shrink-0">
                <span className="font-serif font-bold text-sm text-(--text)">
                  {column}
                </span>
                <span className="text-[10px] font-bold text-(--accent) bg-(--accent-bg) px-2.5 py-0.5 rounded-lg border border-(--border)">
                  {items.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="grow flex flex-col gap-3 overflow-y-auto max-h-175 pr-0.5">
                {items.length === 0 ? (
                  <div className="grow flex items-center justify-center border border-dashed border-(--border) rounded-2xl p-6 text-center text-[10px] text-(--muted) min-h-35 leading-relaxed">
                    Drag RFPs here
                  </div>
                ) : (
                  items.map((ws) => {
                    const isUrgent = getUrgentDeadlineHighlight(ws.deadline);
                    return (
                      <div
                        key={ws.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ws.id)}
                        onDragEnd={handleDragEnd}
                        className={`group relative rounded-2xl border bg-(--surface) p-4 shadow-xs hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col gap-3 ${
                          ws.id === draggingId
                            ? "opacity-25 border-dashed border-(--accent)"
                            : isUrgent && ws.status !== "Submitted"
                              ? "border-amber-350 dark:border-amber-800/40"
                              : "border-(--border)"
                        }`}
                      >
                        {/* Urgent Alert Banner */}
                        {isUrgent && ws.status !== "Submitted" && (
                          <span className="absolute -top-1.5 right-4 rounded-full bg-amber-500 px-2 py-0.5 text-[8px] font-bold text-white tracking-wide uppercase">
                            Soon
                          </span>
                        )}

                        {/* Card Title */}
                        <div className="space-y-1">
                          <Link
                            to={`/workspace/${ws.id}/overview`}
                            draggable="false"
                            className="font-serif font-bold text-xs leading-snug text-(--text) hover:text-(--accent) line-clamp-2 cursor-pointer"
                          >
                            {ws.name}
                          </Link>
                          <div
                            className="flex flex-wrap items-center gap-1.5 mt-2"
                            draggable="false"
                          >
                            <SectorBadge sector={ws.sector} draggable="false" />
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div
                          className="flex items-center justify-between border-t border-(--border) pt-3 text-[10px] text-(--muted)"
                          draggable="false"
                        >
                          <DeadlineChip
                            deadline={ws.deadline}
                            draggable="false"
                          />
                          <span
                            className="font-semibold text-(--text)"
                            draggable="false"
                          >
                            {ws.winProbability}% Win
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
