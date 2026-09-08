import api from "../services/api";

export const getTripSummary = () =>
  api.get("/driver/trips/trip-summary").then((res) => res.data);

export const getActiveTrip = () =>
  api.get("/driver/trips/active").then((res) => res.data);

export const getMyTrips = () =>
  api.get("/driver/trips/my-trips").then((res) => res.data);

export const getWalletCutoffs = () =>
  api.get("/driver/trips/wallet/cutoffs").then((res) => res.data);

export const getWallet = (cutoff) =>
  api
    .get("/driver/trips/wallet", { params: cutoff ? { cutoff } : {} })
    .then((res) => res.data);
