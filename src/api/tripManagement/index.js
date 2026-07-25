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
// GET AVAILABLE STORES
// ========================================
export const getAvailableStores = async () => {
  try {
    const response = await api.get("/driver/trips/available-stores");
    return response.data;
  } catch (error) {
    console.error("Error fetching stores:", error);
    throw error;
  }
};

// ========================================
// GET AVAILABLE VEHICLE UNITS
// ========================================
export const getAvailableVehicleUnits = async () => {
  try {
    const response = await api.get("/trip-maintenance/vehicle-units/active");
    return response.data;
  } catch (error) {
    console.error("Error fetching vehicle units:", error);
    throw error;
  }
};

// ========================================
// START TRIP
// Form data: { shipment_no, vehicle_unit_id, store_id, lat, long, invoice_photo }
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
// Form data: { lat, long, delivery_proof_photo }
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
// Form data: { lat, long, stamped_invoice_photo }
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
