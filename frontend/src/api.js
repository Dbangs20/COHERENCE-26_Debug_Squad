import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export const matchTrials = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/match`, payload);
  return response.data;
};

export const registerPatient = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/auth/register`, payload);
  return response.data;
};

export const loginPatient = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, payload);
  return response.data;
};

export const registerDoctor = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/auth/doctor/register`, payload);
  return response.data;
};

export const loginDoctor = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/auth/doctor/login`, payload);
  return response.data;
};
