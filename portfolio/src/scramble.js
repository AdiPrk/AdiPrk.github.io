const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+";

function instantScramble(element) {
  // 1. Setup
  const originalText = element.dataset.value;
  let iterations = 0;

  // 2. Make visible immediately
  element.style.visibility = "visible";

  // 3. Adaptive Speed:
  const length = originalText.length;
  const step = Math.max(1, Math.ceil(length / 15));

  const interval = setInterval(() => {
    element.innerText = originalText
      .split("")
      .map((letter, index) => {
        if (letter === " " || letter === "\n") return letter;

        if (index < iterations) {
          return originalText[index];
        }
        return chars[Math.floor(Math.random() * chars.length)];
      })
      .join("");

    if (iterations >= length) {
      clearInterval(interval);
      element.innerText = originalText;
    }

    iterations += step;
  }, 20);
}

// Observer Logic
document.addEventListener("DOMContentLoaded", () => {
  const targets = document.querySelectorAll(
    "h1, h2, h3, p:not(.link-text), .tags span, .showcase-btn, .contact-btn, .bio-text"
  );

  targets.forEach((el) => {
    el.dataset.value = el.innerText;
    el.style.visibility = "hidden";
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target;
          instantScramble(target);
          observer.unobserve(target);
        }
      });
    },
    { threshold: 0.1 }
  );

  targets.forEach((el) => observer.observe(el));
});
