import { Check } from 'lucide-react';

export interface StepItem {
  label: string;
}

interface StepperProps {
  steps: StepItem[];
  current: number; // 0-indexed current step
}

/**
 * Progress stepper rendered as a pill bar with a small "Steps" heading.
 * Pills: purple = active (masked/highlighted), teal = completed, gray = upcoming.
 */
export default function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="stepper-wrap" role="presentation" aria-label="Progress">
      <span className="stepper-heading">Steps</span>
      <div className="stepper">
        {steps.map((step, i) => {
          const isDone = i < current;
          const isActive = i === current;
          return (
            <div key={i} className="step-group">
              <div
                className={`step-pill ${isDone ? 'done' : isActive ? 'active' : 'upcoming'}`}
                aria-current={isActive ? 'step' : undefined}
                aria-label={isDone ? `${step.label} complete` : step.label}
              >
                {isDone ? <Check className="w-4 h-4 shrink-0" /> : <span className="step-pill-num">{i + 1}</span>}
                <span className="step-pill-label">{step.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`step-line ${isDone ? 'done' : 'upcoming'}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}