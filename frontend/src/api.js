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

export const parseEligibilityCriteria = async (criteriaText) => {
  const response = await axios.post(`${API_BASE_URL}/parse_criteria`, {
    criteria_text: criteriaText,
  });
  return response.data;
};

export const qaEligibilityCriteria = async (criteriaText) => {
  const response = await axios.post(`${API_BASE_URL}/criteria/qa`, {
    criteria_text: criteriaText,
  });
  return response.data;
};

export const requestPatientReport = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/doctor/request_report`, payload);
  return response.data;
};

export const getPatientReportRequests = async (email) => {
  const response = await axios.get(`${API_BASE_URL}/patient/report_requests`, { params: { email } });
  return response.data;
};

export const uploadPatientReport = async ({ requestId, patientEmail, file }) => {
  const formData = new FormData();
  formData.append("request_id", requestId);
  formData.append("patient_email", patientEmail);
  formData.append("file", file);
  const response = await axios.post(`${API_BASE_URL}/patient/upload_report`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getDoctorReports = async (email) => {
  const response = await axios.get(`${API_BASE_URL}/doctor/reports`, { params: { email } });
  return response.data;
};

export const analyzeDoctorReport = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/doctor/analyze_report`, payload);
  return response.data;
};

export const createResearchReferral = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/doctor/research/referrals`, payload);
  return response.data;
};

export const getDoctorResearchReferrals = async (email) => {
  const response = await axios.get(`${API_BASE_URL}/doctor/research/referrals`, { params: { email } });
  return response.data;
};

export const saveResearchRecommendation = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/doctor/research/recommend`, payload);
  return response.data;
};

export const shareResearchPlanToPatient = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/doctor/research/share_to_patient`, payload);
  return response.data;
};

export const getNotifications = async (email, role) => {
  const response = await axios.get(`${API_BASE_URL}/notifications`, { params: { email, role } });
  return response.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await axios.post(`${API_BASE_URL}/notifications/mark_read`, { notification_id: notificationId });
  return response.data;
};

export const deleteReadNotifications = async (email, role) => {
  const response = await axios.post(`${API_BASE_URL}/notifications/delete_read`, { email, role });
  return response.data;
};

export const deleteNotification = async (notificationId, email, role) => {
  const response = await axios.post(`${API_BASE_URL}/notifications/delete_one`, {
    notification_id: notificationId,
    email,
    role,
  });
  return response.data;
};

export const getPatientAppointmentOptions = async (email) => {
  const response = await axios.get(`${API_BASE_URL}/patient/appointment_options`, { params: { email } });
  return response.data;
};

export const bookAppointment = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/appointments/book`, payload);
  return response.data;
};

export const getPatientAppointments = async (email) => {
  const response = await axios.get(`${API_BASE_URL}/patient/appointments`, { params: { email } });
  return response.data;
};

export const getPatientMedicinePlans = async (email) => {
  const response = await axios.get(`${API_BASE_URL}/patient/medicine_plans`, { params: { email } });
  return response.data;
};

export const getDoctorAppointments = async (email) => {
  const response = await axios.get(`${API_BASE_URL}/doctor/appointments`, { params: { email } });
  return response.data;
};

export const addDoctorAppointmentAdvice = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/doctor/appointments/advice`, payload);
  return response.data;
};

export const completeAppointment = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/doctor/appointments/complete`, payload);
  return response.data;
};

export const getPatientFollowupStatus = async (email) => {
  const response = await axios.get(`${API_BASE_URL}/patient/followup_status`, { params: { email } });
  return response.data;
};

export const requestFollowup = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/followup/request`, payload);
  return response.data;
};

export const getDoctorFollowupRequests = async (email) => {
  const response = await axios.get(`${API_BASE_URL}/doctor/followup_requests`, { params: { email } });
  return response.data;
};

export const sendMessage = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/messages/send`, payload);
  return response.data;
};

export const getMessages = async (appointmentId) => {
  const response = await axios.get(`${API_BASE_URL}/messages`, { params: { appointment_id: appointmentId } });
  return response.data;
};

export const applyToTrial = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/trial/apply`, payload);
  return response.data;
};

export const getFairnessSnapshot = async () => {
  const response = await axios.get(`${API_BASE_URL}/analytics/fairness`);
  return response.data;
};

export const createDoctorSlot = async (payload) => {
  const response = await axios.post(`${API_BASE_URL}/doctor/slots`, payload);
  return response.data;
};

export const getDoctorSlots = async (email) => {
  const response = await axios.get(`${API_BASE_URL}/doctor/slots`, { params: { email } });
  return response.data;
};

export const getPrivacyLogs = async (limit = 20) => {
  const response = await axios.get(`${API_BASE_URL}/privacy/logs`, { params: { limit } });
  return response.data;
};

export const getDemoMetrics = async () => {
  const response = await axios.get(`${API_BASE_URL}/demo/metrics`);
  return response.data;
};

export const runDemoScenario = async () => {
  const response = await axios.post(`${API_BASE_URL}/demo/run`);
  return response.data;
};
