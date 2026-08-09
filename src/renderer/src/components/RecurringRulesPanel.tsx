import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import type { RecurringRule } from '@shared/models';
import { useRecurringRuleStore } from '../stores/recurringRuleStore';
import { RecurringRuleForm } from './RecurringRuleForm';
import { RecurringRuleCard } from './RecurringRuleCard';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

export function RecurringRulesPanel() {
  const { rules, isLoading, error, fetchRules, deleteRule } = useRecurringRuleStore();
  const [formOpen, setFormOpen]       = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<RecurringRule | null>(null);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleEdit  = (rule: RecurringRule) => { setEditingRule(rule); setFormOpen(true); };
  const handleClose = () => { setFormOpen(false); setEditingRule(null); };
  const handleDeleteConfirm = async () => {
    if (!deletingRule) return;
    await deleteRule(deletingRule.id);
    setDeletingRule(null);
  };

  return (
    <div>
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">Recurring Rules</span>
          {rules.length > 0 && (
            <span className="text-xs text-text-muted">{rules.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fetchRules()}
            disabled={isLoading}
            className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-secondary"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditingRule(null); setFormOpen(true); }}
            className="flex h-7 items-center gap-1 rounded bg-accent px-2.5 text-xs font-medium text-white hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            New
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 rounded border border-danger/20 bg-danger-subtle px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && rules.length === 0 && !error && (
        <div className="py-10 text-center">
          <p className="text-xs text-text-muted">No recurring rules yet.</p>
          <p className="mt-0.5 text-2xs text-text-muted opacity-60">
            Create templates for tasks that repeat on a schedule.
          </p>
        </div>
      )}

      {/* Rule list */}
      {rules.length > 0 && (
        <div className="border-t border-border">
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
        onClose={handleClose}
        initialData={
          editingRule
            ? {
                id:               editingRule.id,
                title:            editingRule.title,
                priority:         editingRule.priority,
                estimatedMinutes: editingRule.estimatedMinutes,
                frequency:        editingRule.frequency,
                description:      editingRule.description,
                timeAnchor:       editingRule.timeAnchor,
                daysOfWeek:       editingRule.daysOfWeek,
                dayOfMonth:       editingRule.dayOfMonth,
              }
            : null
        }
      />

      <DeleteConfirmationDialog
        isOpen={deletingRule !== null}
        taskTitle={deletingRule?.title ?? ''}
        itemType="rule"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingRule(null)}
      />
    </div>
  );
}
