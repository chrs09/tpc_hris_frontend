// src/api/tripManagement.js

import api from "../services/api";

// ========================================
// GET ACTIVE TRIP
// ========================================
export const getActiveTrip = async () => {
  try {
    const response = await api.get("/driver/trips/active");
    return response.data;
  } catch (error) {
    console.error("Error fetching active trip:", error);
    throw error;
  }
};

// ========================================
// GET AVAILABLE HELPERS
// ========================================
export const getAvailableHelpers = async () => {
  try {
    const response = await api.get("/driver/trips/available-helpers");
    return response.data;
  } catch (error) {
    console.error("Error fetching helpers:", error);
    throw error;
  }
};

// ========================================
// START TRIP
// payload: { ticket_no, lat, long }
// ========================================
export const startTrip = async (formData) => {
  try {
    const response = await api.post("/driver/trips/start", formData);
    return response.data;
  } catch (error) {
    console.error("Error starting trip:", error);
    throw error;
  }
};

// ========================================
// CHECK IN
// payload: { lat, long }
// ========================================
export const checkIn = async (tripId, payload) => {
  try {
    const response = await api.post(
      `/driver/trips/${tripId}/check-in`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Error checking in:", error);
    throw error;
  }
};

// ========================================
// CHECK OUT
// Requires stopId
// payload: { lat, long }
// ========================================
export const checkOut = async (tripId, stopId, payload) => {
  try {
    const response = await api.post(
      `/driver/trips/${tripId}/check-out/${stopId}`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Error checking out:", error);
    throw error;
  }
};

// ========================================
// COMPLETE TRIP
// payload: { lat, long }
// ========================================
export const completeTrip = async (tripId, payload) => {
  try {
    const response = await api.post(
      `/driver/trips/${tripId}/complete`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Error completing trip:", error);
    throw error;
  }
};
