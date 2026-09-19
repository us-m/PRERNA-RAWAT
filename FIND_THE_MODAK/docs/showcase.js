(() => {
  const progress = document.querySelector("[data-progress]");
  const progressValue = document.querySelector("[data-progress-value]");
  const progressButton = document.querySelector("[data-progress-button]");
  const timer = document.querySelector("[data-demo-timer]");
  const warningButton = document.querySelector("[data-warning-button]");
  let progressAmount = 62;
  let warning = false;

  progressButton?.addEventListener("click", () => {
    progressAmount = progressAmount >= 100 ? 18 : progressAmount + 19;
    progress.style.width = `${progressAmount}%`;
    progressValue.textContent = `${progressAmount}%`;
  });

  warningButton?.addEventListener("click", () => {
    warning = !warning;
    timer.classList.toggle("is-warning", warning);
    timer.textContent = warning ? "09s" : "60s";
    warningButton.textContent = warning ? "Clear warning" : "Show warning";
  });
})();