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

export const getParsedCriteria = async () => {
  const response = await axios.get(`${API_BASE_URL}/criteria/parse`);
  return response.data;
};

export const createPatientCondition = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/patient/conditions`, payload);
  return response.data;
};

export const getPatientConditions = async (email) => {
  const response = await axios.get(`${API_BASE_URL}/patient/conditions`, { params: { email } });
  return response.data;
};

export const createClinicalTrial = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/doctor/clinical_trials`, payload);
  return response.data;
};

export const getDoctorClinicalTrials = async (email) => {
  const response = await axios.get(`${API_BASE_URL}/doctor/clinical_trials`, { params: { email } });
  return response.data;
};

export const matchTrialsByPatientId = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/match_trials`, payload);
  return response.data;
};

export const getDoctorMatchedPatients = async (email, minimumScore = 50) => {
  const response = await axios.get(`${API_BASE_URL}/doctor/matched_patients`, {
    params: { email, minimum_score: minimumScore },
  });
  return response.data;
};
