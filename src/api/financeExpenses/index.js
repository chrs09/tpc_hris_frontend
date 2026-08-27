// src/api/financeExpenses/index.js
import api from "../services/api";

const multipartConfig = {
  headers: {
    "Content-Type": "multipart/form-data",
  },
};

// =========================================================
// GET EXPENSES
// =========================================================

export const getFinanceExpenses = (params = {}) =>
  api.get("/finance/expenses", {
    params,
  });

// =========================================================
// GET EXPENSE DETAIL
// =========================================================

export const getFinanceExpenseDetail = (expenseId) =>
  api.get(`/finance/expenses/${expenseId}`);

// =========================================================
// CREATE EXPENSE
// =========================================================

export const createFinanceExpense = (formData) =>
  api.post("/finance/expenses", formData, multipartConfig);

// =========================================================
// UPDATE EXPENSE
// =========================================================

export const updateFinanceExpense = (expenseId, formData) =>
  api.patch(`/finance/expenses/${expenseId}`, formData, multipartConfig);

// =========================================================
// DELETE EXPENSE
// =========================================================

export const deleteFinanceExpense = (expenseId) =>
  api.delete(`/finance/expenses/${expenseId}`);
