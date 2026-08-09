import { useEffect, useState } from "react";
import { Plus, RefreshCw, Loader2 } from "lucide-react";
import type { RecurringRule } from "@shared/models";
import { useRecurringRuleStore } from "../stores/recurringRuleStore";
import { RecurringRuleForm } from "./RecurringRuleForm";
import { RecurringRuleCard } from "./RecurringRuleCard";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

export function RecurringRulesPanel() {
  const { rules, isLoading, error, fetchRules, deleteRule } =
    useRecurringRuleStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<RecurringRule | null>(null);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleCreate = () => {
    setEditingRule(null);
    setFormOpen(true);
  };

  const handleEdit = (rule: RecurringRule) => {
    setEditingRule(rule);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingRule(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRule) return;
    await deleteRule(deletingRule.id);
    setDeletingRule(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">
          Recurring Tasks
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRules()}
            disabled={isLoading}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
            aria-label="Refresh rules"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
          >
            <Plus className="h-4 w-4" />
            New Rule
          </button>
        </div>
      </div>

      {isLoading && rules.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {!isLoading && rules.length === 0 && !error && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm text-text-muted">No recurring rules yet.</p>
          <p className="mt-1 text-xs text-text-muted">
            Create a template for tasks that repeat on a schedule.
          </p>
        </div>
      )}

      {rules.length > 0 && (
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <RecurringRuleCard
              key={rule.id}
              rule={rule}
              onEdit={handleEdit}
              onDeleteRequest={setDeletingRule}
            />
          ))}
        </div>
      )}

      <RecurringRuleForm
        isOpen={formOpen}
        onClose={handleCloseForm}
        initialData={
          editingRule
            ? {
                id: editingRule.id,
                title: editingRule.title,
                priority: editingRule.priority,
                estimatedMinutes: editingRule.estimatedMinutes,
                frequency: editingRule.frequency,
                description: editingRule.description,
                timeAnchor: editingRule.timeAnchor,
                daysOfWeek: editingRule.daysOfWeek,
                dayOfMonth: editingRule.dayOfMonth,
              }
            : null
        }
      />

      <DeleteConfirmationDialog
        isOpen={deletingRule !== null}
        taskTitle={deletingRule?.title ?? ""}
        itemType="rule"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingRule(null)}
      />
    </div>
  );
}
