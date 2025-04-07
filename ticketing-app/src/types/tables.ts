export type Tables = Record<
  string,
  { columns: { id: string; title: string; width: string }[] }
>;
