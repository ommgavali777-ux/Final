document.addEventListener("DOMContentLoaded", () => {
  const reviewList = document.getElementById("review-list");
  const submitBtn = document.getElementById("submit-review");
  const reviewerInput = document.getElementById("reviewer");
  const reviewTextInput = document.getElementById("review-text");

  // Load saved reviews
  const loadReviews = () => {
    const saved = JSON.parse(localStorage.getItem("gymReviews")) || [];
    reviewList.innerHTML = "";
    saved.forEach(r => addReviewToDOM(r.name, r.text));
  };

  // Add new review
  const addReviewToDOM = (name, text) => {
    const div = document.createElement("div");
    div.className = "bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition transform hover:-translate-y-1 animate-fadeIn";
    div.innerHTML = `
      <p class="text-gray-700 italic mb-3">"${text}"</p>
      <h4 class="text-indigo-700 font-semibold text-right">- ${name}</h4>
    `;
    reviewList.prepend(div);
  };

  // Handle submit
  submitBtn.addEventListener("click", () => {
    const name = reviewerInput.value.trim();
    const text = reviewTextInput.value.trim();
    if (!name || !text) return alert("Please enter your name and review!");

    addReviewToDOM(name, text);

    // Save to localStorage
    const reviews = JSON.parse(localStorage.getItem("gymReviews")) || [];
    reviews.push({ name, text });
    localStorage.setItem("gymReviews", JSON.stringify(reviews));

    reviewerInput.value = "";
    reviewTextInput.value = "";
  });

  loadReviews();
  // ====== HAMBURGER MENU CODE ======
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");

  menuBtn.addEventListener("click", () => {
    if (mobileMenu.classList.contains("scale-y-0")) {
      mobileMenu.classList.remove("scale-y-0", "hidden");
      mobileMenu.classList.add("scale-y-100");
    } else {
      mobileMenu.classList.add("scale-y-0");
      setTimeout(() => mobileMenu.classList.add("hidden"), 300);
    }
  });
});
