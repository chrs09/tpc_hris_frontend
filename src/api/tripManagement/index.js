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
// GET AVAILABLE HELPERS
// Helpers eligible for the logged-in driver's department (mirrors the
// mobile app's getAvailableHelpers)
// ========================================
export const getAvailableHelpers = async (driverId) => {
  try {
    const params = driverId ? `?driver_id=${driverId}` : "";
    const response = await api.get(`/driver/trips/available-helpers${params}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching helpers:", error);
    throw error;
  }
};

// ========================================
// DISPATCH TRIP (coordinator-only -- office's first step in the 7-step
// flow: assign a driver, vehicle, and origin hub. No shipment number or
// destination store yet -- the driver fills those in at their own
// Checkout step, OCR-assisted from the Invoice/LM they photograph.)
// Form data: { driver_id, vehicle_unit_id, origin_store_id, helper_ids }
// ========================================
export const dispatchTrip = async (formData) => {
  try {
    const response = await api.post("/driver/trips/dispatch", formData);
    return response.data;
  } catch (error) {
    console.error("Error dispatching trip:", error);
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
// Form data: { lat, long, proof_photo }
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
// STEP 1: CHECKOUT OCR PREVIEW (non-committing)
// Form data: { invoice_photo, lm_photo }
// ========================================
export const checkoutOcrPreview = async (tripId, formData) => {
  try {
    const response = await api.post(
      `/driver/trips/${tripId}/checkout/ocr-preview`,
      formData,
    );
    return response.data;
  } catch (error) {
    console.error("Error previewing checkout OCR:", error);
    throw error;
  }
};

// ========================================
// STEP 1: CHECKOUT
// Form data: { shipment_no, destination_store_id, invoice_photo, lm_photo }
// ========================================
export const checkoutTrip = async (tripId, formData) => {
  try {
    const response = await api.post(
      `/driver/trips/${tripId}/checkout`,
      formData,
    );
    return response.data;
  } catch (error) {
    console.error("Error checking out trip:", error);
    throw error;
  }
};

// ========================================
// STEP 2: START TRIP (button only -- vehicle is assigned by the
// coordinator at dispatch time now)
// ========================================
export const startTrip = async (tripId) => {
  try {
    const response = await api.post(`/driver/trips/${tripId}/start`);
    return response.data;
  } catch (error) {
    console.error("Error starting trip:", error);
    throw error;
  }
};

// ========================================
// STEP 4: START UNLOADING
// Form data: { photo }
// ========================================
export const startUnloading = async (tripId, stopId, formData) => {
  try {
    const response = await api.post(
      `/driver/trips/${tripId}/stops/${stopId}/start-unloading`,
      formData,
    );
    return response.data;
  } catch (error) {
    console.error("Error starting unloading:", error);
    throw error;
  }
};

// ========================================
// STEP 6: BACK TO SOURCE
// Form data: { lat, long, lm_perma_photo }
// ========================================
export const backToSource = async (tripId, formData) => {
  try {
    const response = await api.post(
      `/driver/trips/${tripId}/back-to-source`,
      formData,
    );
    return response.data;
  } catch (error) {
    console.error("Error heading back to source:", error);
    throw error;
  }
};

// ========================================
// STEP 7: CHECKIN (final step -- back at hub)
// Form data: { lat, long, stamped_invoice_photo }
// ========================================
export const checkinTrip = async (tripId, formData) => {
  try {
    const response = await api.post(
      `/driver/trips/${tripId}/checkin`,
      formData,
    );
    return response.data;
  } catch (error) {
    console.error("Error checking in trip:", error);
    throw error;
  }
};
