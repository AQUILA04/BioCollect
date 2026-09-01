import { useI18n } from "@/contexts/I18nContext";
import { FINGER_TYPES, fingerLabelKey } from "@/lib/biocollect-ui";

type FingerPickerProps = {
  value: string[];
  onChange: (fingers: string[]) => void;
  disabled?: boolean;
};

export function FingerPicker({ value, onChange, disabled }: FingerPickerProps) {
  const { t } = useI18n();
  function toggle(finger: string) {
    if (disabled) return;
    onChange(value.includes(finger) ? value.filter(item => item !== finger) : [...value, finger]);
  }
  return (
    <fieldset className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <legend className="text-sm font-semibold text-slate-900">{t("projects.requiredFingers")}</legend>
        <span className="text-xs text-slate-500">{t("projects.fingersSelected", { count: value.length, total: FINGER_TYPES.length })}</span>
      </div>
      <p className="text-sm leading-6 text-slate-500">{t("projects.fingersHelp")}</p>
      <div className="bio-finger-grid">
        {FINGER_TYPES.map(finger => (
          <button
            key={finger}
            type="button"
            disabled={disabled}
            data-selected={value.includes(finger)}
            className="bio-finger-btn"
            onClick={() => toggle(finger)}
          >
            {t(fingerLabelKey(finger))}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
