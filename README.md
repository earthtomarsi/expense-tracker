# Spendflow Expense Tracker

Spendflow is a single-page expense tracking web application that helps users record, manage, and review their spending history. It supports database-backed CRUD operations, dynamic filtering and sorting, manual search, editable expense history, category summaries, and monthly spending trends.

## Problem It Solves

Many people track expenses in spreadsheets or scattered notes, which makes it harder to review patterns, edit past entries, and understand where money is going. Spendflow provides a cleaner workflow for logging expenses and analysing spending by category and month in one interface.

## Technical Stack

- **Frontend:** HTML, CSS, JavaScript
- **Styling:** Custom CSS
- **Backend:** Node.js + Express
- **Database:** MySQL
- **Charts:** Chart.js
- **Routing / Data Flow:** REST API endpoints between frontend and backend
- **Database Export:** `expense_tracker.sql`

## Features

- Single-page application interface
- Create, read, update, and delete expenses from a MySQL database
- Add expenses with title, amount, category, date, and description
- Edit table rows with Save / Cancel workflow
- Delete expenses directly from the table
- Filter by category
- Filter by month
- Sort by date, amount, or name
- Manual title search
- Pagination with 10 rows per page
- Category breakdown summary
- Monthly spending trend chart
- Pie chart for spending by category
- Responsive filter layout
- Favicon and consistent visual branding
- Tooltips for truncated table content
- User-facing status messages for database or server errors

## Folder Structure

- `index.html` – main single-page app interface
- `style.css` – all application styling and responsive layout rules
- `script.js` – frontend logic, rendering, validation, filtering, editing, search, pagination, and charts
- `server.js` – Express server and API routes
- `db.js` – MySQL database connection configuration
- `package.json` – project dependencies and scripts
- `package-lock.json` – exact dependency versions
- `Assets/` – static assets such as the favicon
- `expense_tracker.sql` – exported MySQL database structure and data

## Challenges Overcome

One challenge was converting the original front-end-only version into a database-backed CRUD application while keeping the interaction smooth. Another challenge was preserving a single-page experience even after introducing backend persistence, search, pagination, and edit mode. I also refined the table editing flow so users could make multiple changes safely using Save and Cancel instead of updating the database on every cell interaction. Finally, I improved the UI structure, responsive filter behaviour, error handling, and chart-table relationship so that the experience felt more polished and intuitive.

## How to Run the Project

### 1. Install dependencies:

   ```bash
   npm install

### 2. Set up the MySQL database

Create a MySQL database named expense_tracker.
CREATE DATABASE expense_tracker;

### 3. Import the database export

Import the included SQL file to recreate the same schema and sample data used for this project.
If mysql is available on your PATH:
mysql -u root -p expense_tracker < expense_tracker.sql

If mysql is not on your PATH, use your MySQL binary path instead, for example:
/usr/local/mysql/bin/mysql -u root -p expense_tracker < expense_tracker.sql

### 4. Configure the database connection

Check db.js and make sure the MySQL connection details match your local setup, such as username, password, host, and database name.

### 5. Start the backend server

node server.js

### 6. Open the application

Open index.html in your browser, or use a local live server if needed.

## API Overview

The frontend communicates with the backend using these REST endpoints:
- GET /expenses – retrieve all expenses
- POST /expenses – create a new expense
- PUT /expenses/:id – update an existing expense
- DELETE /expenses/:id – delete an expense

## Notes

The app is designed as a single-page application, so interactions such as filtering, editing, searching, and pagination happen without navigating away from the main page.
Search affects the table view only, while the charts and summary cards continue to reflect the saved expense data.
Edit mode uses a Save / Cancel workflow so multiple table changes can be reviewed before being committed to the database.
Submission Files Included

##This repository includes:

### source code
### backend files
### MySQL database export
### README documentation
### static assets