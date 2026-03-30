let expenses = [];

function addExpense() {
  const name = document.getElementById("name").value;
  const amount = Number(document.getElementById("amount").value);
  const category = document.getElementById("category").value;

  if (!name || !amount) return;

  const expense = {
    name: name,
    amount: amount,
    category: category
  };

  expenses.push(expense);

  renderExpenses();
}

function renderExpenses() {
  const list = document.getElementById("expense-list");
  list.innerHTML = "";

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