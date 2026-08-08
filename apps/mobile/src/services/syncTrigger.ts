// Lets the data layer nudge a cloud sync after writes without importing cloudSync
// directly (which would create a circular dependency). cloudSync registers the
// real (debounced) handler once it loads.
let handler: () => void = () => {};

export const setSyncTrigger = (fn: () => void) => { handler = fn; };
export const triggerSync = () => handler();
