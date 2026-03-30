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
  
    console.log(expenses);
  }