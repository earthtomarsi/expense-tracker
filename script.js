let expenses = [];
let categoryChart = null;
let pieChart = null;
let currentFilter = "All";
let currentSort = "date-desc";

// DOM elements
const expenseNameInput = document.getElementById("expenseName");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const addBtn = document.getElementById("add-btn");
const expenseNameError = document.getElementById("expenseName-error");
const amountError = document.getElementById("amount-error");
const dateInput = document.getElementById("date");
const dateError = document.getElementById("date-error");
const descInput = document.getElementById("description");
const descError = document.getElementById("desc-error");
const descCounter = document.getElementById("desc-counter");

// Event listeners
addBtn.addEventListener("click", addExpense);

// Clear name error as user types in name
expenseNameInput.addEventListener("input", () => {
  expenseNameError.textContent = "";
  expenseNameInput.classList.remove("error");
});

// Clear amount error + live validation as user types in amount
amountInput.addEventListener("input", () => {
  const raw = amountInput.value.trim();
  const helper = document.getElementById("amount-helper");

  amountError.textContent = "";
  amountInput.classList.remove("error");
  helper.textContent = "";
  helper.classList.remove("error");

  if (hasInvalidLeadingZero(raw)) {
    amountInput.value = "";
    helper.textContent = "Amount cannot start with 0";
    helper.classList.add("error");
    amountInput.classList.add("error");
    return;
  }

  validateAmountLive();
});

descInput.addEventListener("input", () => {
    descInput.classList.remove("error");
    
    const length = descInput.value.length;
    descCounter.textContent = `${length}/70`;
  
    if (length >= 70) {
      descError.textContent = "Max 70 characters";
    } else {
      descError.textContent = "";
    }
});

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {

    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentFilter = btn.dataset.category;

    renderExpenses();
  });
});

document.getElementById("sort-select").addEventListener("change", (e) => {
  currentSort = e.target.value;
  renderExpenses();
});

dateInput.addEventListener("input", () => {
  const value = dateInput.value;

  dateError.textContent = "";
  dateInput.classList.remove("error");

  if (!value) {
    dateError.textContent = "Please select a valid date";
    dateInput.classList.add("error");
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    dateError.textContent = "Use format YYYY-MM-DD";
    dateInput.classList.add("error");
    return;
  }

  const [year] = value.split("-").map(Number);

  if (year > 2026) {
    dateError.textContent = "Year cannot be greater than 2026";
    dateInput.classList.add("error");
    return;
  }

  const date = new Date(value);

  if (
    date.getFullYear() !== Number(value.slice(0, 4)) ||
    date.getMonth() + 1 !== Number(value.slice(5, 7)) ||
    date.getDate() !== Number(value.slice(8, 10))
  ) {
    dateError.textContent = "Please enter a valid calendar date";
    dateInput.classList.add("error");
    return;
  }

  dateError.textContent = "";
  dateInput.classList.remove("error");
});

function hasInvalidLeadingZero(value) {
  return /^0\d/.test(value.trim());
}

function addExpense() {
  const expenseName = expenseNameInput.value.trim();
  const amountRaw = amountInput.value;
  const amount = amountRaw === "" ? null : Number(amountRaw);
  const category = categoryInput.value;
  const date = dateInput.value;
  const description = descInput.value.trim();

  expenseNameError.textContent = "";
  amountError.textContent = "";
  dateError.textContent = "";
  descError.textContent = "";

  let hasError = false;

  // NAME validation
  if (!expenseName) {
    expenseNameError.textContent = "Please enter an expense name";
    expenseNameInput.classList.add("error"); 
    hasError = true;
  } else {
    expenseNameInput.classList.remove("error");
  }

  // AMOUNT validation
  if (amountRaw === "" || amount === null) {
    amountError.textContent = "Please enter an expense amount";
    amountInput.classList.add("error");
    hasError = true;
  } else if (isNaN(amount)) {
    amountError.textContent = "Please enter a valid number";
    amountInput.classList.add("error");
    hasError = true;
  } else if (hasInvalidLeadingZero(amountRaw)) {
    amountError.textContent = "Amount cannot start with 0";
    amountInput.classList.add("error");
    hasError = true;
  } else if (amount <= 0) {
    amountError.textContent = "Please enter a valid amount greater than 0";
    amountInput.classList.add("error");
    hasError = true;
  } else {
    amountInput.classList.remove("error");
  }

  // DATE validation
  if (dateInput.value === "" || dateInput.value == null) {
    dateError.textContent = "Please select a date";
    dateInput.classList.add("error"); 
    hasError = true;
  } else {
    dateInput.classList.remove("error");
  }

  // DESCRIPTION
  if (!description) {
    descError.textContent = "Please enter a description";
    descInput.classList.add("error");
    hasError = true;
  } else if (description.length > 70) {
    descError.textContent = "Max 70 characters";
    descInput.classList.add("error");
    hasError = true;
  } else {
    descInput.classList.remove("error");
  }

  if (hasError) return;

  expenses.push({ expenseName, amount, category, date, description, dateError: "" });

  renderExpenses();

  // Clear inputs
  expenseNameInput.value = "";
  amountInput.value = "";
  dateInput.value = "";
  descInput.value = "";
  descCounter.textContent = "0/70";

  setTodayDate();
}

function validateAmountLive() {
  const amountRaw = amountInput.value;
  const helper = document.getElementById("amount-helper");

  helper.textContent = "";
  helper.classList.remove("error");
  amountInput.classList.remove("error");

  if (amountRaw === "") return;

  const amount = Number(amountRaw);

  if (isNaN(amount)) {
    helper.textContent = "Please enter a valid number";
    helper.classList.add("error");
    amountInput.classList.add("error"); 
  } else if (amount <= 0) {
    helper.textContent = "Amount must be greater than 0";
    helper.classList.add("error");
    amountInput.classList.add("error");
  } else {
    amountInput.classList.remove("error"); 
  }
}

function renderExpenses() {
  const body = document.getElementById("expense-body");

  body.innerHTML = "";

  // APPLY FILTER + SORT
let filtered = [...expenses];

// FILTER
if (currentFilter !== "All") {
  filtered = filtered.filter(exp => exp.category === currentFilter);
}

// SORT
filtered.sort((a, b) => {
  switch (currentSort) {
    case "amount-asc":
      return a.amount - b.amount;

    case "amount-desc":
      return b.amount - a.amount;

    case "name-asc":
      return a.expenseName.localeCompare(b.expenseName);

    case "name-desc":
      return b.expenseName.localeCompare(a.expenseName);

    case "date-asc":
      return new Date(a.date) - new Date(b.date);

    case "date-desc":
    default:
      return new Date(b.date) - new Date(a.date);
  }
});

if (expenses.length === 0) {
  body.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center; color:#a1a1a1; padding:16px;">
        No expenses yet
      </td>
    </tr>
  `;

  document.getElementById("total").textContent = formatCurrency(0);
  document.getElementById("category-totals").innerHTML = "";

  if (pieChart) {
    pieChart.destroy();
    pieChart = null;
  }

  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
  }

  const lineChartContainer = document.querySelector(".chart-container");
  if (lineChartContainer) {
    lineChartContainer.style.display = "none";
  }

  return;
}

  let total = 0;

  filtered.forEach((expense) => {
    const index = expenses.indexOf(expense);
    total += expense.amount;

    const row = document.createElement("tr");

    const categoryOptions = Array.from(categoryInput.options)
      .map(opt => `<option value="${opt.value}" ${opt.value === expense.category ? "selected" : ""}>${opt.text}</option>`)
      .join("");

    row.innerHTML = `
      <td class="editable"
          contenteditable="true"
          onfocus="this.classList.add('editing')"
          onblur="this.classList.remove('editing'); updateExpense(${index}, 'expenseName', this.innerText)">
        ${expense.expenseName}
      </td>

      <td class="editable"
          contenteditable="true"
          onfocus="this.classList.add('editing')"
          onblur="this.classList.remove('editing'); updateExpense(${index}, 'amount', this.innerText, this)">
        ${expense.amount}
      </td>

      <td class="category-cell">
        <select class="editable"
                onchange="updateExpense(${index}, 'category', this.value)">
          ${categoryOptions}
        </select>
      </td>

      <td class="editable date-cell" contenteditable="true" 
        onblur="updateExpense(${index}, 'date', this.innerText, this)"> ${expense.date || ""}
      </td>

      <td class="editable"
          contenteditable="true"
          onblur="updateExpense(${index}, 'description', this.innerText)">
        ${expense.description || ""}
      </td>

      <td>
        <button class="delete-btn" onclick="deleteExpense(${index})">×</button>
      </td>
    `;

    body.appendChild(row);
  });

const lineChartContainer = document.querySelector(".chart-container");
if (lineChartContainer) {
  lineChartContainer.style.display = "block";
}

  document.getElementById("total").textContent = formatCurrency(total);
  updateCategoryTotals();
  renderChart();
  renderPieChart();
}

function getCategoryTotals() {
    const totals = {};
  
    expenses.forEach(exp => {
      if (!totals[exp.category]) {
        totals[exp.category] = 0;
      }
      totals[exp.category] += exp.amount;
    });
  
    return totals;
  }

  function updateCategoryTotals() {
    const totals = {};
  
    expenses.forEach(exp => {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
    });
  
    const container = document.getElementById("category-totals");
    container.innerHTML = "";
  
    for (let category in totals) {
      const div = document.createElement("div");
      div.className = "category-item";
  
      div.innerHTML = `
        <span>${category}</span>
        <span>${formatCurrency(totals[category])}</span>
      `;
  
      container.appendChild(div);
    }
  }
function renderPieChart() {
  const totals = {};
  let grandTotal = 0;

  expenses.forEach(exp => {
    totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
    grandTotal += exp.amount;
  });

  const categoryColors = {
    Food: "#F59E0B",
    Bills: "#10B981",
    Transport: "#3B82F6",
    Leisure: "#EF4444",
    Shopping: "#EC4899"
  };

  const labels = Object.keys(totals);
  const data = labels.map(label => totals[label]);
  const backgroundColor = labels.map(label => categoryColors[label] || "#ccc");

  const ctx = document.getElementById("pieChart");

  if (pieChart) pieChart.destroy();

  pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        },

        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;

              const formatted = value.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2
              });

              return `${context.label}: ${formatted}`;
            }
          }
        }
      }
    }
  });
}

function formatCurrency(amount) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

function deleteExpense(index) {
    expenses.splice(index, 1);
    renderExpenses();
    renderChart();
  }
  
  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split("-").map(Number);
  
    if (year > 2026) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
  
    const date = new Date(value);
  
    return (
      date.getFullYear() === year &&
      date.getMonth() + 1 === month &&
      date.getDate() === day
    );
  }

function placeCursorAtEnd(el) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function updateExpense(index, field, value, el = null) {
  value = value.trim();

  if (field === "date") {
    const trimmed = value;
  
    if (!/^\d{0,4}(-\d{0,2}){0,2}$/.test(trimmed)) {
      if (el) el.innerText = expenses[index].date || "";
      return;
    }
  
    if (trimmed.length === 10 && !isValidDate(trimmed)) {
      expenses[index].dateError = "Invalid calendar date";
  
      if (el) {
        el.innerText = expenses[index].date || "";
      }
  
      renderExpenses();
      return;
    }
  
    // valid date
    expenses[index].dateError = "";
    expenses[index].date = trimmed;
  
    renderExpenses();
    return;
  }

  if (field === "amount") {
    const elValue = value.trim();
    const previousValue = expenses[index].amount.toString();
  
    if (hasInvalidLeadingZero(elValue)) {
      if (el) el.innerText = previousValue;
      return;
    }
  
    const isValid = /^\d+(\.\d{1,2})?$/.test(elValue);
  
    if (!isValid) {
      if (el) el.innerText = previousValue;
      return;
    }
  
    const numericValue = Number(elValue);
  
    if (numericValue <= 0 || isNaN(numericValue)) {
      if (el) el.innerText = previousValue;
      return;
    }
  
    expenses[index].amount = numericValue;
  
    if (el) {
      el.innerText = String(numericValue);
    }
  
    renderExpenses();
    return;
  }

  expenses[index][field] = value;

  renderExpenses();
}

function updateTotalsOnly() {
  let total = 0;

  expenses.forEach(exp => {
    total += exp.amount;
  });

  document.getElementById("total").textContent = formatCurrency(total);

  updateCategoryTotals();
  renderChart();
}
  
function renderChart() {
    const monthlyTotals = {};
  
    expenses.forEach(exp => {
      if (!exp.date) return;
  
      const date = new Date(exp.date);
  
      // Format: Jan 2026
      const monthKey = date.toLocaleString("en-US", {
        month: "short",
        year: "numeric"
      });
  
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + exp.amount;
    });
  
    const sorted = Object.entries(monthlyTotals).sort((a, b) => {
        return new Date(a[0]) - new Date(b[0]);
    });
      
    const labels = sorted.map(item => item[0]);
    const data = sorted.map(item => item[1]);
  
    const ctx = document.getElementById("categoryChart");
  
    if (categoryChart) categoryChart.destroy();
  
    categoryChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Monthly Spending",
          data,
          borderColor: "#2ecc71",
          backgroundColor: "rgba(46, 204, 113, 0.1)",
          tension: 0.3,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
}

const usernameWrapper = document.querySelector(".username-wrapper");
const profile = document.querySelector(".profile");

usernameWrapper.addEventListener("click", function () {
  this.classList.toggle("active");
});

profile.addEventListener("mouseleave", () => {
  usernameWrapper.classList.remove("active");
});

function logout() {
    alert("Logged out");
}

document.addEventListener("focusout", (e) => {
  if (e.target.classList.contains("editable")) {
    e.target.classList.remove("editing");
  }
});

function setTodayDate() {
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
  dateInput.classList.add("has-value");
}

setTodayDate();
renderExpenses();