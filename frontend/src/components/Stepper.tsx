import { Check } from 'lucide-react';

export interface StepItem {
  label: string;
}

interface StepperProps {
  steps: StepItem[];
  current: number; // 0-indexed current step
}

/**
 * Progress stepper.
 * Colors: purple = active, teal = completed, gray = upcoming.
 */
export default function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="stepper" role="presentation" aria-label="Progress">
      {steps.map((step, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <div key={i} className="step" style={{ opacity: isActive ? 1 : 0.7 }} aria-current={isActive ? 'step' : undefined}>
            <div
              className={`step-dot ${isDone ? 'done' : isActive ? 'active' : 'upcoming'}`}
              aria-label={isDone ? `${step.label} complete` : step.label}
            >
              {isDone ? <Check className="w-4 h-4" /> : <span>{i + 1}</span>}
            </div>
            {i < steps.length - 1 && <div className={`step-line ${isDone ? 'done' : 'upcoming'}`} />}
          </div>
        );
      })}
    </div>
  );
}
