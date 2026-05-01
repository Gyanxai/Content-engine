import type { AdminRole } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import type { ContentStatus } from '../services/contentService';
import { updateQuestionStatus } from '../services/contentService';

interface StatusWorkflowProps {
  questionId: string;
  currentStatus: ContentStatus;
  onUpdated: (newStatus: ContentStatus) => void;
}

const STEPS: ContentStatus[] = ['draft', 'in_review', 'published'];
const STEP_LABELS: Record<ContentStatus, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  published: 'Published',
};
const STEP_COLORS: Record<ContentStatus, string> = {
  draft: '#FEC61F',
  in_review: '#1DAAF4',
  published: '#4EB679',
};

function canTransition(from: ContentStatus, to: ContentStatus, role: AdminRole): boolean {
  if (role === 'admin' || role === 'editor') return true;
  if (role === 'creator' && from === 'draft' && to === 'in_review') return true;
  if (role === 'reviewer' && from === 'in_review' && (to === 'published' || to === 'draft')) return true;
  return false;
}

export default function StatusWorkflow({ questionId, currentStatus, onUpdated }: StatusWorkflowProps) {
  const { role, user } = useAuth();
  const currentIdx = STEPS.indexOf(currentStatus);

  const handleTransition = async (newStatus: ContentStatus) => {
    if (!role || !user) return;
    if (!canTransition(currentStatus, newStatus, role)) return;
    try {
      await updateQuestionStatus(questionId, newStatus, user.uid);
      onUpdated(newStatus);
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {STEPS.map((step, idx) => {
        const isActive = step === currentStatus;
        const isPast = idx < currentIdx;
        const canGoNext = role && canTransition(currentStatus, step, role) && step !== currentStatus;
        const color = STEP_COLORS[step];

        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {idx > 0 && <div style={{ width: 24, height: 2, backgroundColor: isPast ? '#4EB679' : 'var(--border-color)' }} />}
            <button
              onClick={() => canGoNext && handleTransition(step)}
              disabled={!canGoNext}
              title={canGoNext ? `Move to ${STEP_LABELS[step]}` : STEP_LABELS[step]}
              style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${isActive ? color : isPast ? '#4EB679' : 'var(--border-color)'}`,
                backgroundColor: isActive ? color + '18' : isPast ? 'rgba(78,182,121,0.08)' : 'transparent',
                color: isActive ? color : isPast ? '#4EB679' : 'var(--text-secondary)',
                cursor: canGoNext ? 'pointer' : 'default',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {STEP_LABELS[step]}
            </button>
          </div>
        );
      })}
    </div>
  );
}

