// Keep the SDK's existing storage key so previously signed-in accounts survive.
export function sessionStorageChoice(local, session, storageKey) {
  const preference = 'wachochemer:remember';
  const remembers = () => local.getItem(preference) !== 'false';
  const primary = () => remembers() ? local : session;
  const secondary = () => remembers() ? session : local;
  return {
    remembers,
    setRemember(value) {
      const before = primary();
      const values = [storageKey, storageKey + '-code-verifier', storageKey + '-user']
        .map(key => [key, before.getItem(key)]);
      local.setItem(preference, String(value));
      for (const [key, content] of values) {
        if (content !== null) primary().setItem(key, content);
        secondary().removeItem(key);
      }
    },
    getItem(key) { return primary().getItem(key); },
    setItem(key, value) {
      primary().setItem(key, value);
      secondary().removeItem(key);
    },
    removeItem(key) { local.removeItem(key); session.removeItem(key); }
  };
}
