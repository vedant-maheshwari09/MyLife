export const MOOD_OPTIONS = [
  { emoji: "😄", label: "Very Happy", value: "very_happy" },
  { emoji: "🙂", label: "Happy", value: "happy" },
  { emoji: "😐", label: "Neutral", value: "neutral" },
  { emoji: "😕", label: "Sad", value: "sad" },
  { emoji: "😢", label: "Very Sad", value: "very_sad" },
] as const;

export const PRODUCTIVITY_OPTIONS = [
  { emoji: "😩", label: "Very Unsatisfied", value: "very_unsatisfied" },
  { emoji: "😔", label: "Not Satisfied", value: "not_satisfied" },
  { emoji: "😐", label: "Neutral", value: "neutral" },
  { emoji: "😊", label: "Satisfied", value: "satisfied" },
  { emoji: "🤩", label: "Very Satisfied", value: "very_satisfied" },
] as const;

export const HEALTH_OPTIONS = [
  { emoji: "🤒", label: "Very Unwell", value: "very_unwell" },
  { emoji: "😷", label: "Unwell", value: "unwell" },
  { emoji: "😐", label: "Okay", value: "okay" },
  { emoji: "😊", label: "Good", value: "good" },
  { emoji: "💪", label: "Excellent", value: "excellent" },
] as const;

export type MoodValue = typeof MOOD_OPTIONS[number]["value"];
export type ProductivityValue = typeof PRODUCTIVITY_OPTIONS[number]["value"];
export type HealthValue = typeof HEALTH_OPTIONS[number]["value"];

export function getMoodEmoji(mood: string | null): string {
  const moodOption = MOOD_OPTIONS.find(option => option.value === mood);
  return moodOption?.emoji || "";
}

export function getMoodLabel(mood: string | null): string {
  const moodOption = MOOD_OPTIONS.find(option => option.value === mood);
  return moodOption?.label || "";
}

export function getProductivityEmoji(productivity: string | null): string {
  const productivityOption = PRODUCTIVITY_OPTIONS.find(option => option.value === productivity);
  return productivityOption?.emoji || "";
}

export function getProductivityLabel(productivity: string | null): string {
  const productivityOption = PRODUCTIVITY_OPTIONS.find(option => option.value === productivity);
  return productivityOption?.label || "";
}

export function getHealthEmoji(health: string | null): string {
  const healthOption = HEALTH_OPTIONS.find(option => option.value === health);
  return healthOption?.emoji || "";
}

export function getHealthLabel(health: string | null): string {
  const healthOption = HEALTH_OPTIONS.find(option => option.value === health);
  return healthOption?.label || "";
}