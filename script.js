let expenses = [];

function addExpense() {
  const nameInput = document.getElementById("name");
  const amountInput = document.getElementById("amount");
  const categoryInput = document.getElementById("category");

  const name = nameInput.value;
  const amount = Number(amountInput.value);
  const category = categoryInput.value;

  if (!name || !amount) return;

  const expense = { name, amount, category };
  expenses.push(expense);

  renderExpenses();

  // clear inputs
  nameInput.value = "";
  amountInput.value = "";
}

function renderExpenses() {
  const list = document.getElementById("expense-list");
  list.innerHTML = "";

  if (expenses.length === 0) {
    list.innerHTML = "<p>No expenses yet</p>";
    document.getElementById("total").textContent = "0";
    document.getElementById("category-totals").innerHTML = "";
    return;
  }

  let total = 0;

  expenses.forEach((expense, index) => {
    total += expense.amount;

    const li = document.createElement("li");
    li.className = "expense-item";

    li.innerHTML = `
      <span>${expense.name} ($${expense.amount}) - ${expense.category}</span>
      <button onclick="deleteExpense(${index})">X</button>
    `;

    list.appendChild(li);
  });

  document.getElementById("total").textContent = total;

  updateCategoryTotals();
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
    div.textContent = `${category}: $${totals[category]}`;
    container.appendChild(div);
  }
}