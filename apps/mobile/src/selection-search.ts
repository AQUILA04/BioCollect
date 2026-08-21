type SelectionOption = { value: string; label: string };

export const LARGE_SELECTION_THRESHOLD = 12;
export const SEARCH_RESULTS_LIMIT = 50;

function searchable(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(); }

export function normalizeSelectionOption(option: string | SelectionOption): SelectionOption { return typeof option === "string" ? { value: option, label: option } : option; }
export function shouldUseSelectionSearch(options: Array<string | SelectionOption>) { return options.length > LARGE_SELECTION_THRESHOLD; }
export function searchChoiceItems<T extends SelectionOption>(options: T[], query: string, limit = SEARCH_RESULTS_LIMIT): T[] {
  const term = searchable(query.trim());
  return options.map(option => {
    const label = searchable(option.label); const value = searchable(option.value);
    const rank = !term ? 0 : label.startsWith(term) ? 1 : value.startsWith(term) ? 2 : label.includes(term) || value.includes(term) ? 3 : 9;
    return { option, rank };
  }).filter(item => item.rank < 9).sort((left, right) => left.rank - right.rank || left.option.label.localeCompare(right.option.label)).slice(0, limit).map(item => item.option);
}

export function searchSelectionOptions(options: Array<string | SelectionOption>, query: string, limit = SEARCH_RESULTS_LIMIT) { return searchChoiceItems(options.map(normalizeSelectionOption), query, limit); }
