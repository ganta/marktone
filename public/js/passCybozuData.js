(() => {
  document.dispatchEvent(
    new CustomEvent("cybozuDataPass", {
      detail: cybozu.data,
    }),
  );
})();
