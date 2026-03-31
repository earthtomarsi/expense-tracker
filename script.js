let expenses = [];

// DOM elements
const nameInput = document.getElementById("name");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const addBtn = document.getElementById("add-btn");
const nameError = document.getElementById("name-error");
const amountError = document.getElementById("amount-error");

// Event listeners
addBtn.addEventListener("click", addExpense);

// Clear name error as user types in name
nameInput.addEventListener("input", () => {
  nameError.textContent = "";
});

// Clear amount error + live validation as user types in amount
amountInput.addEventListener("input", () => {
  amountError.textContent = "";
  validateAmountLive();
});

function addExpense() {
  const name = nameInput.value.trim();
  const amountRaw = amountInput.value;
  const amount = Number(amountRaw);
  const category = categoryInput.value;

  nameError.textContent = "";
  amountError.textContent = "";

  let hasError = false;

  // NAME validation
  if (!name) {
    nameError.textContent = "Please enter an expense name";
    hasError = true;
  }

  // AMOUNT validation
  if (!amountRaw) {
    amountError.textContent = "Please enter an expense amount";
    hasError = true;
  } else if (isNaN(amount) || amount <= 0) {
    amountError.textContent = "Please enter a valid amount greater than 0";
    hasError = true;
  }

  if (hasError) return;

  expenses.push({ name, amount, category });
  renderExpenses();

  // Clear inputs
  nameInput.value = "";
  amountInput.value = "";
  document.getElementById("amount-helper").textContent = "";
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
  } else if (amount <= 0) {
    helper.textContent = "Amount must be greater than 0";
    helper.classList.add("error");
  }
}

function renderExpenses() {
  const body = document.getElementById("expense-body");

  body.innerHTML = "";

  if (expenses.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; color:#a1a1a1; padding:16px;">
          No expenses yet
        </td>
      </tr>
    `;

    document.getElementById("total").textContent = formatCurrency(0);
    document.getElementById("category-totals").innerHTML = "";
    return;
  }

  let total = 0;

  expenses.forEach((expense, index) => {
    total += expense.amount;

    const row = document.createElement("tr");

    // clone category options for dropdown
    const categoryOptions = Array.from(categoryInput.options)
      .map(opt => `<option value="${opt.value}" ${opt.value === expense.category ? "selected" : ""}>${opt.text}</option>`)
      .join("");

    row.innerHTML = `
      <td class="editable"
          contenteditable="true"
          onfocus="this.classList.add('editing')"
          onblur="this.classList.remove('editing'); updateExpense(${index}, 'name', this.innerText)">
        ${expense.name}
      </td>

      <td class="editable"
          contenteditable="true"
          onfocus="this.classList.add('editing')"
          onblur="this.classList.remove('editing'); updateExpense(${index}, 'amount', this.innerText)">
        ${formatCurrency(expense.amount)}
      </td>

      <td>
        <select class="editable"
                onchange="updateExpense(${index}, 'category', this.value)">
          ${categoryOptions}
        </select>
      </td>

      <td>
        <button class="delete-btn" onclick="deleteExpense(${index})">×</button>
      </td>
    `;

    body.appendChild(row);
  });

  document.getElementById("total").textContent = formatCurrency(total);
  updateCategoryTotals();
}

function updateExpense(index, field, value) {
  if (!expenses[index]) return;

  if (field === "amount") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const num = Number(cleaned);

    if (isNaN(num) || num <= 0) {
      renderExpenses();
      return;
    }

    expenses[index][field] = num;
  } else {
    expenses[index][field] = value.trim();
  }

  renderExpenses();
}

function deleteExpense(index) {
  expenses.splice(index, 1);
  renderExpenses();
}

function updateCategoryTotals() {
  const totals = {};

  expenses.forEach(exp => {
    if (!totals[exp.category]) {
      totals[exp.category] = 0;
    }
    totals[exp.category] += exp.amount;
  });

  const container = document.getElementById("category-totals");
  container.innerHTML = "";

  for (let category in totals) {
    const div = document.createElement("div");
    div.textContent = `${category}: ${formatCurrency(totals[category])}`;
    container.appendChild(div);
  }
}

function formatCurrency(amount) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

renderExpenses();

function logout() {
  alert("Logged out");
}

const usernameWrapper = document.querySelector(".username-wrapper");
const profile = document.querySelector(".profile");

usernameWrapper.addEventListener("click", function () {
  this.classList.toggle("active");
});

profile.addEventListener("mouseleave", () => {
  usernameWrapper.classList.remove("active");
});