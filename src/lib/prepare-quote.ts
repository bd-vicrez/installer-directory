/** Start the module download while checking current shop permission. */
export async function prepareQuoteDialog(
  checkAvailability: () => Promise<boolean>,
  loadDialog: () => Promise<unknown>,
) {
  // Settle the speculative import even when availability fails first.
  const ready = Promise.resolve()
    .then(loadDialog)
    .then(() => true, () => false);
  if (!(await checkAvailability())) return false;
  if (!(await ready)) throw new Error("The quote form could not load. Please retry.");
  return true;
}
