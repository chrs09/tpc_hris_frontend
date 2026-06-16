import api from "../services/api";

// VEHICLE UNITS

export const getVehicleUnits = async () => {
  try {
    const response = await api.get("/trip-maintenance/vehicle-units");

    return response.data;
  } catch (error) {
    console.error("Error fetching vehicle units:", error);
    throw error;
  }
};

export const getActiveVehicleUnits = async () => {
  try {
    const response = await api.get("/trip-maintenance/vehicle-units/active");

    return response.data;
  } catch (error) {
    console.error("Error fetching active vehicle units:", error);
    throw error;
  }
};

export const createVehicleUnit = async (payload) => {
  try {
    const formData = new FormData();

    formData.append("unit_code", payload.unit_code);

    formData.append("plate_number", payload.plate_number);

    formData.append("description", payload.description || "");

    const response = await api.post(
      "/trip-maintenance/vehicle-units",
      formData,
    );

    return response.data;
  } catch (error) {
    console.error("Error creating vehicle unit:", error);
    throw error;
  }
};

export const updateVehicleUnit = async (id, payload) => {
  try {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    const response = await api.patch(
      `/trip-maintenance/vehicle-units/${id}`,
      formData,
    );

    return response.data;
  } catch (error) {
    console.error("Error updating vehicle unit:", error);
    throw error;
  }
};

export const deleteVehicleUnit = async (id) => {
  try {
    const response = await api.delete(`/trip-maintenance/vehicle-units/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error deleting vehicle unit:", error);
    throw error;
  }
};

// ========= RATE PROFILES =================
export const getRateProfiles = async () => {
  try {
    const response = await api.get("/trip-maintenance/rate-profiles");

    return response.data;
  } catch (error) {
    console.error("Error fetching rate profiles:", error);
    throw error;
  }
};

export const getActiveRateProfiles = async () => {
  try {
    const response = await api.get("/trip-maintenance/rate-profiles/active");

    return response.data;
  } catch (error) {
    console.error("Error fetching active rate profiles:", error);
    throw error;
  }
};

export const createRateProfile = async (payload) => {
  try {
    const formData = new FormData();

    formData.append("profile_name", payload.profile_name);

    formData.append("helper_count", payload.helper_count);

    formData.append("driver_first_trip_rate", payload.driver_first_trip_rate);

    formData.append("driver_next_trip_rate", payload.driver_next_trip_rate);

    formData.append("helper_first_trip_rate", payload.helper_first_trip_rate);

    formData.append("helper_next_trip_rate", payload.helper_next_trip_rate);

    const response = await api.post(
      "/trip-maintenance/rate-profiles",
      formData,
    );

    return response.data;
  } catch (error) {
    console.error("Error creating rate profile:", error);
    throw error;
  }
};

export const updateRateProfile = async (id, payload) => {
  try {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    const response = await api.patch(
      `/trip-maintenance/rate-profiles/${id}`,
      formData,
    );

    return response.data;
  } catch (error) {
    console.error("Error updating rate profile:", error);
    throw error;
  }
};

export const deleteRateProfile = async (id) => {
  try {
    const response = await api.delete(`/trip-maintenance/rate-profiles/${id}`);

    return response.data;
  } catch (error) {
    console.error("Error deleting rate profile:", error);
    throw error;
  }
};
