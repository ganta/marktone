(() => {
  document.dispatchEvent(
    new CustomEvent("cybozuDataPass", {
      detail: JSON.stringify(cybozu.data),
    }),
  );
})();
