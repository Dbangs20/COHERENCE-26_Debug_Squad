import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoctorAppointmentAdvice,
  applyToTrial,
  bookAppointment,
  analyzeDoctorReport,
  createResearchReferral,
  completeAppointment,
  createClinicalTrial,
  createPatientCondition,
  getDoctorAppointments,
  getDoctorClinicalTrials,
  getDoctorFollowupRequests,
  getDoctorMatchedPatients,
  getDoctorReports,
  getFairnessSnapshot,
  getPatientAppointmentOptions,
  getPatientAppointments,
  getPatientConditions,
  getPatientMedicinePlans,
  getPatientFollowupStatus,
  getPrivacyLogs,
  getPatientReportRequests,
  getDoctorResearchReferrals,
  matchTrialsByPatientId,
  parseEligibilityCriteria,
  qaEligibilityCriteria,
  requestFollowup,
  requestPatientReport,
  saveResearchRecommendation,
  shareResearchPlanToPatient,
  getMessages,
  sendMessage,
  uploadPatientReport,
} from "../api";
import MatchAnalytics from "../components/MatchAnalytics";

const StatusBadge = ({ status }) => {
  const styles =
    status === "Strong Match"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Moderate Match"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{status}</span>;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatSeconds = (seconds) => {
  const safe = Math.max(0, Number(seconds || 0));
  const h = String(Math.floor(safe / 3600)).padStart(2, "0");
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(safe % 60)).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const getRemainingSecondsFromIso = (isoDate) => {
  if (!isoDate) return 0;
  const target = new Date(isoDate).getTime();
  const now = Date.now();
  const remaining = Math.floor((target - now) / 1000);
  return remaining > 0 ? remaining : 0;
};

const toFallbackFollowupItem = (appointment) => {
  const remaining = getRemainingSecondsFromIso(appointment.followup_available_at);
  return {
    appointment_id: appointment.id,
    patient_id: appointment.patient_id,
    doctor_email: appointment.doctor_email,
    trial_id: appointment.trial_id,
    status: appointment.status,
    appointment_completed_at: appointment.appointment_completed_at,
    followup_available_at: appointment.followup_available_at,
    followup_enabled: remaining === 0 && Boolean(appointment.followup_available_at),
    seconds_remaining: remaining,
  };
};

const Landing = () => {
  const navigate = useNavigate();

  const patientSession = useMemo(() => {
    try {
      const stored = localStorage.getItem("curenovaPatientSession");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const doctorSession = useMemo(() => {
    try {
      const stored = localStorage.getItem("curenovaDoctorSession");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const [activeRole, setActiveRole] = useState("");

  const [patientRecords, setPatientRecords] = useState([]);
  const [showPatientForm, setShowPatientForm] = useState(true);
  const [patientMessage, setPatientMessage] = useState("");
  const [patientError, setPatientError] = useState("");

  const [recommendedTrials, setRecommendedTrials] = useState([]);
  const [rejectedTrials, setRejectedTrials] = useState([]);
  const [expandedTrialId, setExpandedTrialId] = useState("");
  const [appliedTrials, setAppliedTrials] = useState({});
  const [activePatientIdForMatch, setActivePatientIdForMatch] = useState("");

  const [patientReportRequests, setPatientReportRequests] = useState([]);
  const [patientAppointmentOptions, setPatientAppointmentOptions] = useState([]);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [patientFollowupItems, setPatientFollowupItems] = useState([]);
  const [followupSafetyNotice, setFollowupSafetyNotice] = useState("");
  const [selectedPatientFollowup, setSelectedPatientFollowup] = useState(null);
  const [patientFollowupVideoUrl, setPatientFollowupVideoUrl] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [bookingAppointment, setBookingAppointment] = useState(false);
  const [appointmentSuggestions, setAppointmentSuggestions] = useState([]);
  const appointmentFormRef = useRef(null);
  const [appointmentFormData, setAppointmentFormData] = useState({
    patient_id: "",
    doctor_email: "",
    trial_id: "",
    appointment_date: "",
    appointment_time: "",
  });
  const [reportFiles, setReportFiles] = useState({});
  const [uploadingRequestId, setUploadingRequestId] = useState(null);

  const [trialFilters, setTrialFilters] = useState({
    city: "",
    disease: "",
    trial_phase: "",
    minimum_score: 0,
  });

  const [patientFormData, setPatientFormData] = useState({
    age: "",
    gender: "",
    disease: "",
    disease_stage: "",
    biomarker: "",
    city: "",
    diabetes: false,
    hypertension: false,
    heart_disease: false,
    kidney_disease: false,
    current_medications: "",
    smoking_status: "",
    pregnancy_status: "",
    lab_results: "",
  });

  const [doctorTrials, setDoctorTrials] = useState([]);
  const [doctorMatchedPatients, setDoctorMatchedPatients] = useState([]);
  const [doctorReports, setDoctorReports] = useState([]);
  const [doctorResearchReferrals, setDoctorResearchReferrals] = useState([]);
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [doctorFollowupRequests, setDoctorFollowupRequests] = useState([]);
  const [processingCompleteAppointmentId, setProcessingCompleteAppointmentId] = useState(null);
  const [selectedDoctorFollowup, setSelectedDoctorFollowup] = useState(null);
  const [doctorChatMessages, setDoctorChatMessages] = useState([]);
  const [doctorChatInput, setDoctorChatInput] = useState("");
  const [doctorLoadingChat, setDoctorLoadingChat] = useState(false);
  const [doctorSendingChat, setDoctorSendingChat] = useState(false);
  const [doctorAdviceByAppointmentId, setDoctorAdviceByAppointmentId] = useState({});
  const [fairnessSnapshot, setFairnessSnapshot] = useState(null);
  const [privacyLogs, setPrivacyLogs] = useState([]);
  const [doctorMessage, setDoctorMessage] = useState("");
  const [doctorError, setDoctorError] = useState("");
  const [doctorToast, setDoctorToast] = useState({ show: false, message: "", type: "info" });

  const [requestingReportKey, setRequestingReportKey] = useState("");
  const [requiredTestsByMatchKey, setRequiredTestsByMatchKey] = useState({});
  const [analyzingReportId, setAnalyzingReportId] = useState(null);
  const [forwardingReportId, setForwardingReportId] = useState(null);
  const [savingResearchReferralId, setSavingResearchReferralId] = useState(null);
  const [sharingResearchReferralId, setSharingResearchReferralId] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState("");
  const [researcherInputByReferralId, setResearcherInputByReferralId] = useState({});
  const [patientMedicinePlans, setPatientMedicinePlans] = useState([]);

  const [trialFormData, setTrialFormData] = useState({
    trial_id: "",
    title: "",
    disease: "",
    phase: "",
    description: "",
    min_age: "",
    max_age: "",
    disease_required: "",
    disease_stage: "",
    biomarker_required: "",
    exclusion_diabetes: false,
    exclusion_heart_disease: false,
    exclusion_pregnancy: false,
    hospital: "",
    city: "",
    country: "India",
    start_date: "",
    end_date: "",
    max_participants: "",
    criteria_text: "",
  });

  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [followupClockTick, setFollowupClockTick] = useState(0);
  const [isMatchingTrials, setIsMatchingTrials] = useState(false);
  const [isSavingTrial, setIsSavingTrial] = useState(false);
  const [isLoadingDoctorMatches, setIsLoadingDoctorMatches] = useState(false);
  const [isLoadingDoctorReports, setIsLoadingDoctorReports] = useState(false);
  const [isParsingCriteria, setIsParsingCriteria] = useState(false);
  const [parsedCriteria, setParsedCriteria] = useState(null);
  const [criteriaQA, setCriteriaQA] = useState(null);
  const [juryWalkthroughActive, setJuryWalkthroughActive] = useState(false);
  const [juryWalkthroughIndex, setJuryWalkthroughIndex] = useState(0);
  const juryWalkthroughTimer = useRef(null);
  const sectionRefs = useRef({});

  const juryWalkthroughSteps = [
    "fairness",
    "clinical_trial_form",
    "matched_patients",
    "appointments",
    "privacy_logs",
    "reports",
  ];

  const loadPatientRecords = async () => {
    if (!patientSession?.email) return;
    setIsLoadingRecords(true);
    setPatientError("");
    try {
      const data = await getPatientConditions(patientSession.email);
      setPatientRecords(data || []);
      setShowPatientForm((data || []).length === 0);
    } catch (error) {
      setPatientError("Unable to load patient records.");
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const loadPatientReportRequests = async () => {
    if (!patientSession?.email) return;
    try {
      const data = await getPatientReportRequests(patientSession.email);
      setPatientReportRequests(data || []);
    } catch (error) {
      setPatientReportRequests([]);
    }
  };

  const loadPatientAppointmentOptions = async () => {
    if (!patientSession?.email) return;
    try {
      const data = await getPatientAppointmentOptions(patientSession.email);
      setPatientAppointmentOptions(data.options || []);
    } catch (error) {
      setPatientAppointmentOptions([]);
    }
  };

  const loadPatientAppointments = async () => {
    if (!patientSession?.email) return;
    try {
      const data = await getPatientAppointments(patientSession.email);
      setPatientAppointments(data.appointments || []);
    } catch (error) {
      setPatientAppointments([]);
    }
  };

  const loadPatientFollowupStatus = async () => {
    if (!patientSession?.email) return;
    try {
      const data = await getPatientFollowupStatus(patientSession.email);
      setPatientFollowupItems(data.items || []);
      setFollowupSafetyNotice(data.safety_notice || "");
    } catch (error) {
      setPatientFollowupItems([]);
      setFollowupSafetyNotice("");
      setPatientError("Unable to fetch follow-up status from server. Showing local fallback when available.");
    }
  };

  const loadDoctorTrials = async () => {
    if (!doctorSession?.email) return;
    setDoctorError("");
    try {
      const data = await getDoctorClinicalTrials(doctorSession.email);
      setDoctorTrials(data || []);
    } catch (error) {
      setDoctorError("Unable to load clinical trials.");
    }
  };

  const loadDoctorMatchedPatients = async () => {
    if (!doctorSession?.email) return;
    setIsLoadingDoctorMatches(true);
    try {
      const data = await getDoctorMatchedPatients(doctorSession.email, 50);
      setDoctorMatchedPatients(data.matches || []);
    } catch (error) {
      setDoctorError("Unable to load matched patients.");
      setDoctorMatchedPatients([]);
    } finally {
      setIsLoadingDoctorMatches(false);
    }
  };

  const loadDoctorReports = async () => {
    if (!doctorSession?.email) return;
    setIsLoadingDoctorReports(true);
    try {
      const data = await getDoctorReports(doctorSession.email);
      setDoctorReports(data.reports || []);
    } catch (error) {
      setDoctorError("Unable to load verified patient reports.");
      setDoctorReports([]);
    } finally {
      setIsLoadingDoctorReports(false);
    }
  };

  const loadDoctorResearchReferrals = async () => {
    if (!doctorSession?.email) return;
    try {
      const data = await getDoctorResearchReferrals(doctorSession.email);
      setDoctorResearchReferrals(data.referrals || []);
    } catch (error) {
      setDoctorResearchReferrals([]);
    }
  };

  const loadDoctorAppointments = async () => {
    if (!doctorSession?.email) return;
    try {
      const data = await getDoctorAppointments(doctorSession.email);
      setDoctorAppointments(data.appointments || []);
    } catch (error) {
      setDoctorAppointments([]);
    }
  };

  const loadPatientMedicinePlans = async () => {
    if (!patientSession?.email) return;
    try {
      const data = await getPatientMedicinePlans(patientSession.email);
      setPatientMedicinePlans(data.plans || []);
    } catch (error) {
      setPatientMedicinePlans([]);
    }
  };

  const loadDoctorFollowupRequests = async () => {
    if (!doctorSession?.email) return;
    try {
      const data = await getDoctorFollowupRequests(doctorSession.email);
      setDoctorFollowupRequests(data.requests || []);
    } catch (error) {
      setDoctorFollowupRequests([]);
    }
  };

  const loadFairnessSnapshot = async () => {
    try {
      const data = await getFairnessSnapshot();
      setFairnessSnapshot(data);
    } catch (error) {
      setFairnessSnapshot(null);
    }
  };

  const loadPrivacyLogs = async () => {
    try {
      const data = await getPrivacyLogs(25);
      setPrivacyLogs(data.logs || []);
    } catch (error) {
      setPrivacyLogs([]);
    }
  };

  const startJuryWalkthrough = () => {
    setJuryWalkthroughIndex(0);
    setJuryWalkthroughActive(true);
  };

  const stopJuryWalkthrough = () => {
    setJuryWalkthroughActive(false);
    if (juryWalkthroughTimer.current) {
      clearTimeout(juryWalkthroughTimer.current);
      juryWalkthroughTimer.current = null;
    }
  };

  const getSectionClass = (sectionKey) =>
    juryWalkthroughActive && juryWalkthroughSteps[juryWalkthroughIndex] === sectionKey
      ? "ring-2 ring-cyan-400 ring-offset-2 animate-pulse"
      : "";

  const effectiveFollowupItems = useMemo(() => {
    if (patientFollowupItems.length > 0) return patientFollowupItems;
    return (patientAppointments || [])
      .filter((appointment) => appointment.status === "completed" || appointment.status === "followup_requested")
      .map((appointment) => toFallbackFollowupItem(appointment));
  }, [patientFollowupItems, patientAppointments]);

  const sectionCountdownSeconds = useMemo(() => {
    const positive = effectiveFollowupItems
      .map((item) => (item.followup_enabled ? 0 : getRemainingSecondsFromIso(item.followup_available_at)))
      .filter((seconds) => seconds > 0);
    if (positive.length > 0) return Math.min(...positive);
    if (effectiveFollowupItems.length > 0) return 0;
    if ((patientAppointments || []).length > 0) return 2 * 60 * 60;
    return 0;
  }, [effectiveFollowupItems, patientAppointments, followupClockTick]);

  useEffect(() => {
    if (!doctorToast.show) return;
    const timer = setTimeout(() => {
      setDoctorToast((prev) => ({ ...prev, show: false }));
    }, 3200);
    return () => clearTimeout(timer);
  }, [doctorToast.show]);

  const matchedPatientsByTrial = useMemo(() => {
    const grouped = {};
    for (const trial of doctorTrials) {
      const trialDisease = String(trial?.disease || "").trim().toLowerCase();
      grouped[trial.trial_id] = doctorMatchedPatients.filter((item) => {
        const itemDisease = String(item?.disease || "").trim().toLowerCase();
        if (trialDisease && itemDisease !== trialDisease) return false;
        return item.trial_id === trial.trial_id;
      });
    }
    return grouped;
  }, [doctorTrials, doctorMatchedPatients]);

  useEffect(() => {
    if (patientSession?.email) {
      loadPatientRecords();
      loadPatientReportRequests();
      loadPatientAppointmentOptions();
      loadPatientAppointments();
      loadPatientFollowupStatus();
      loadPatientMedicinePlans();
    }
  }, [patientSession?.email]);

  useEffect(() => {
    if (doctorSession?.email) {
      loadDoctorTrials();
      loadDoctorMatchedPatients();
      loadDoctorReports();
      loadDoctorResearchReferrals();
      loadDoctorAppointments();
      loadDoctorFollowupRequests();
      loadFairnessSnapshot();
      loadPrivacyLogs();
    }
  }, [doctorSession?.email]);

  useEffect(() => {
    if (!juryWalkthroughActive) return;
    const currentKey = juryWalkthroughSteps[juryWalkthroughIndex];
    const target = sectionRefs.current[currentKey];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (juryWalkthroughIndex >= juryWalkthroughSteps.length - 1) {
      juryWalkthroughTimer.current = setTimeout(() => {
        setJuryWalkthroughActive(false);
      }, 2400);
      return () => {
        if (juryWalkthroughTimer.current) clearTimeout(juryWalkthroughTimer.current);
      };
    }
    juryWalkthroughTimer.current = setTimeout(() => {
      setJuryWalkthroughIndex((prev) => prev + 1);
    }, 2600);
    return () => {
      if (juryWalkthroughTimer.current) clearTimeout(juryWalkthroughTimer.current);
    };
  }, [juryWalkthroughActive, juryWalkthroughIndex]);

  useEffect(() => {
    if (!patientSession?.email) return;
    const interval = setInterval(() => {
      loadPatientFollowupStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [patientSession?.email]);

  useEffect(() => {
    if (!patientSession?.email) return;
    const timer = setInterval(() => {
      setFollowupClockTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [patientSession?.email]);

  useEffect(() => {
    if (!doctorSession?.email) return;
    const interval = setInterval(() => {
      loadDoctorFollowupRequests();
      loadDoctorAppointments();
    }, 15000);
    return () => clearInterval(interval);
  }, [doctorSession?.email]);

  useEffect(() => {
    if (!selectedPatientFollowup?.appointment_id) return;
    const interval = setInterval(() => {
      loadPatientChat(selectedPatientFollowup.appointment_id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedPatientFollowup?.appointment_id]);

  useEffect(() => {
    if (!selectedDoctorFollowup?.appointment_id) return;
    const interval = setInterval(() => {
      loadDoctorChat(selectedDoctorFollowup.appointment_id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedDoctorFollowup?.appointment_id]);

  const handlePatientChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPatientFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTrialFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setTrialFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleReportFileChange = (requestId, file) => {
    setReportFiles((prev) => ({ ...prev, [requestId]: file }));
  };

  const handleOpenAppointmentForm = () => {
    if (patientAppointmentOptions.length === 0) {
      setPatientError("Appointment booking will be enabled after doctor confirms trial selection.");
      return;
    }
    setShowAppointmentForm(true);
    if (patientAppointmentOptions.length > 0) {
      const firstOption = patientAppointmentOptions[0];
      setAppointmentFormData((prev) => ({
        ...prev,
        patient_id: firstOption.patient_id,
        doctor_email: firstOption.doctor_email,
        trial_id: firstOption.trial_id,
      }));
    }
    setTimeout(() => {
      appointmentFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  };

  const handleAppointmentFieldChange = (event) => {
    const { name, value } = event.target;
    setAppointmentFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBookAppointment = async (event) => {
    event.preventDefault();
    if (!patientSession?.email) return;
    setPatientError("");
    setPatientMessage("");
    setBookingAppointment(true);
    setAppointmentSuggestions([]);
    try {
      const response = await bookAppointment({
        patient_email: patientSession.email,
        patient_id: appointmentFormData.patient_id,
        doctor_email: appointmentFormData.doctor_email,
        trial_id: appointmentFormData.trial_id,
        appointment_date: appointmentFormData.appointment_date,
        appointment_time: appointmentFormData.appointment_time,
      });
      if (!response.success) {
        setPatientError(response.message || "Unable to book appointment.");
        setAppointmentSuggestions(response.suggested_slots || []);
        return;
      }
      setPatientMessage(response.message || "Appointment booked successfully. Both patient and doctor have been notified.");
      setAppointmentFormData({
        patient_id: "",
        doctor_email: "",
        trial_id: "",
        appointment_date: "",
        appointment_time: "",
      });
      setShowAppointmentForm(false);
      await loadPatientAppointments();
    } catch (error) {
      setPatientError(error?.response?.data?.detail || "Unable to book appointment.");
    } finally {
      setBookingAppointment(false);
    }
  };

  const handleDoctorAdviceChange = (appointmentId, value) => {
    setDoctorAdviceByAppointmentId((prev) => ({ ...prev, [appointmentId]: value }));
  };

  const handleDoctorAdviceSubmit = async (appointmentId) => {
    if (!doctorSession?.email) return;
    const advice = (doctorAdviceByAppointmentId[appointmentId] || "").trim();
    if (!advice) {
      setDoctorError("Please enter advice before sending.");
      return;
    }
    setDoctorError("");
    try {
      await addDoctorAppointmentAdvice({
        appointment_id: appointmentId,
        doctor_email: doctorSession.email,
        advice,
      });
      setDoctorMessage("Special advice sent to patient successfully.");
      setDoctorAdviceByAppointmentId((prev) => ({ ...prev, [appointmentId]: "" }));
      await loadDoctorAppointments();
    } catch (error) {
      setDoctorError(error?.response?.data?.detail || "Unable to send advice.");
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    if (!doctorSession?.email) return;
    setDoctorError("");
    setDoctorMessage("");
    setProcessingCompleteAppointmentId(appointmentId);
    try {
      const response = await completeAppointment({
        appointment_id: appointmentId,
        doctor_email: doctorSession.email,
      });
      setDoctorMessage(response.message || "Appointment marked completed.");
      await loadDoctorAppointments();
    } catch (error) {
      setDoctorError(error?.response?.data?.detail || "Unable to complete appointment.");
    } finally {
      setProcessingCompleteAppointmentId(null);
    }
  };

  const handleRequestFollowup = async (appointmentId, mode) => {
    if (!patientSession?.email) return;
    setPatientError("");
    setPatientMessage("");
    try {
      const response = await requestFollowup({
        appointment_id: appointmentId,
        patient_email: patientSession.email,
        mode,
      });
      setPatientMessage(response.message || "Follow-up requested.");
      if (response.video_url) {
        setPatientFollowupVideoUrl(response.video_url);
      }
      await loadPatientFollowupStatus();
      await loadPatientAppointments();
    } catch (error) {
      setPatientError(error?.response?.data?.detail || "Unable to request follow-up.");
    }
  };

  const loadPatientChat = async (appointmentId) => {
    setLoadingChat(true);
    try {
      const data = await getMessages(appointmentId);
      setChatMessages(data.messages || []);
    } catch (error) {
      setChatMessages([]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handlePatientOpenChat = async (item) => {
    setSelectedPatientFollowup(item);
    await loadPatientChat(item.appointment_id);
  };

  const handlePatientSendChat = async () => {
    if (!selectedPatientFollowup || !patientSession?.email || !chatInput.trim()) return;
    setSendingChat(true);
    try {
      await sendMessage({
        appointment_id: selectedPatientFollowup.appointment_id,
        patient_id: selectedPatientFollowup.patient_id,
        patient_email: patientSession.email,
        doctor_email: selectedPatientFollowup.doctor_email,
        sender_role: "patient",
        message_text: chatInput.trim(),
      });
      setChatInput("");
      await loadPatientChat(selectedPatientFollowup.appointment_id);
    } catch (error) {
      setPatientError(error?.response?.data?.detail || "Unable to send message.");
    } finally {
      setSendingChat(false);
    }
  };

  const loadDoctorChat = async (appointmentId) => {
    setDoctorLoadingChat(true);
    try {
      const data = await getMessages(appointmentId);
      setDoctorChatMessages(data.messages || []);
    } catch (error) {
      setDoctorChatMessages([]);
    } finally {
      setDoctorLoadingChat(false);
    }
  };

  const handleDoctorOpenChat = async (requestItem) => {
    setSelectedDoctorFollowup(requestItem);
    await loadDoctorChat(requestItem.appointment_id);
  };

  const handleDoctorSendChat = async () => {
    if (!selectedDoctorFollowup || !doctorSession?.email || !doctorChatInput.trim()) return;
    setDoctorSendingChat(true);
    try {
      await sendMessage({
        appointment_id: selectedDoctorFollowup.appointment_id,
        patient_id: selectedDoctorFollowup.patient_id,
        patient_email: selectedDoctorFollowup.patient_email || "",
        doctor_email: doctorSession.email,
        sender_role: "doctor",
        message_text: doctorChatInput.trim(),
      });
      setDoctorChatInput("");
      await loadDoctorChat(selectedDoctorFollowup.appointment_id);
    } catch (error) {
      setDoctorError(error?.response?.data?.detail || "Unable to send message.");
    } finally {
      setDoctorSendingChat(false);
    }
  };

  

  const submitPatientForm = async (event) => {
    event.preventDefault();
    if (!patientSession?.email) return;

    setPatientError("");
    setPatientMessage("");

    try {
      await createPatientCondition({
        patient_email: patientSession.email,
        age: Number(patientFormData.age),
        gender: patientFormData.gender,
        disease: patientFormData.disease,
        disease_stage: patientFormData.disease_stage || null,
        biomarker: patientFormData.biomarker || null,
        city: patientFormData.city || null,
        diabetes: patientFormData.diabetes,
        hypertension: patientFormData.hypertension,
        heart_disease: patientFormData.heart_disease,
        kidney_disease: patientFormData.kidney_disease,
        current_medications: patientFormData.current_medications || null,
        smoking_status: patientFormData.smoking_status || null,
        pregnancy_status: patientFormData.pregnancy_status || null,
        lab_results: patientFormData.lab_results || null,
      });

      setPatientMessage("Patient medical record saved successfully.");
      setShowPatientForm(false);
      setPatientFormData({
        age: "",
        gender: "",
        disease: "",
        disease_stage: "",
        biomarker: "",
        city: "",
        diabetes: false,
        hypertension: false,
        heart_disease: false,
        kidney_disease: false,
        current_medications: "",
        smoking_status: "",
        pregnancy_status: "",
        lab_results: "",
      });
      await loadPatientRecords();
    } catch (error) {
      setPatientError(error?.response?.data?.detail || "Unable to save patient record.");
    }
  };

  const submitTrialForm = async (event) => {
    event.preventDefault();
    if (!doctorSession?.email) return;

    setDoctorError("");
    setDoctorMessage("");
    setIsSavingTrial(true);

    try {
      const exclusionConditions = [
        trialFormData.exclusion_diabetes ? "diabetes" : "",
        trialFormData.exclusion_heart_disease ? "heart_disease" : "",
        trialFormData.exclusion_pregnancy ? "pregnancy" : "",
      ]
        .filter(Boolean)
        .join(",");

      await createClinicalTrial({
        doctor_email: doctorSession.email,
        trial_id: trialFormData.trial_id,
        title: trialFormData.trial_title || trialFormData.title,
        disease: trialFormData.disease_required || trialFormData.disease,
        phase: trialFormData.trial_phase || trialFormData.phase,
        min_age: trialFormData.min_age ? Number(trialFormData.min_age) : null,
        max_age: trialFormData.max_age ? Number(trialFormData.max_age) : null,
        stage: trialFormData.disease_stage || null,
        biomarker: trialFormData.biomarker_required || null,
        exclusion_conditions: exclusionConditions || null,
        criteria_text: trialFormData.criteria_text || null,
        city: trialFormData.city || null,
        hospital: trialFormData.hospital || null,
        country: trialFormData.country || null,
        start_date: trialFormData.start_date || null,
        end_date: trialFormData.end_date || null,
        max_participants: trialFormData.max_participants ? Number(trialFormData.max_participants) : null,
      });

      setDoctorMessage("Clinical trial registered successfully.");
      setTrialFormData({
        trial_id: "",
        title: "",
        disease: "",
        phase: "",
        description: "",
        min_age: "",
        max_age: "",
        disease_required: "",
        disease_stage: "",
        biomarker_required: "",
        exclusion_diabetes: false,
        exclusion_heart_disease: false,
        exclusion_pregnancy: false,
        hospital: "",
        city: "",
        country: "India",
        start_date: "",
        end_date: "",
        max_participants: "",
        criteria_text: "",
      });
      await loadDoctorTrials();
      await loadDoctorMatchedPatients();
    } catch (error) {
      setDoctorError(error?.response?.data?.detail || "Unable to register clinical trial.");
    } finally {
      setIsSavingTrial(false);
    }
  };

  const handleParseCriteria = async () => {
    if (!trialFormData.criteria_text.trim()) {
      setDoctorError("Please enter eligibility criteria text before parsing.");
      return;
    }
    setDoctorError("");
    setIsParsingCriteria(true);
    try {
      const parsed = await parseEligibilityCriteria(trialFormData.criteria_text);
      const qa = await qaEligibilityCriteria(trialFormData.criteria_text);
      setParsedCriteria(parsed);
      setCriteriaQA(qa);
      setTrialFormData((prev) => ({
        ...prev,
        min_age: parsed.min_age ?? prev.min_age,
        max_age: parsed.max_age ?? prev.max_age,
        disease_required: parsed.disease || prev.disease_required,
        disease_stage: parsed.stage || prev.disease_stage,
        biomarker_required: parsed.biomarker || prev.biomarker_required,
        exclusion_diabetes: parsed.exclude_conditions.includes("diabetes"),
        exclusion_heart_disease: parsed.exclude_conditions.includes("heart disease"),
        exclusion_pregnancy: parsed.exclude_conditions.includes("pregnancy"),
      }));
      if (parsed.status === "partial") {
        setDoctorMessage(parsed.message);
      } else {
        setDoctorMessage("Eligibility criteria parsed and fields auto-filled.");
      }
    } catch (error) {
      setDoctorError(error?.response?.data?.detail || "Unable to parse eligibility criteria.");
      setParsedCriteria(null);
      setCriteriaQA(null);
    } finally {
      setIsParsingCriteria(false);
    }
  };

  const startTrialMatching = async (patientId) => {
    setIsMatchingTrials(true);
    setPatientError("");
    setActivePatientIdForMatch(patientId);

    try {
      const data = await matchTrialsByPatientId({
        patient_id: patientId,
        city: trialFilters.city || null,
        disease: trialFilters.disease || null,
        trial_phase: trialFilters.trial_phase || null,
        minimum_score: Number(trialFilters.minimum_score || 0),
      });
      setRecommendedTrials(data.recommendations || []);
      setRejectedTrials(data.rejected_trials || []);
    } catch (error) {
      setPatientError(error?.response?.data?.detail || "Unable to match clinical trials.");
      setRecommendedTrials([]);
      setRejectedTrials([]);
    } finally {
      setIsMatchingTrials(false);
    }
  };

  const applyForTrial = async (trialId) => {
    if (!patientSession?.email || !activePatientIdForMatch) {
      setPatientError("Please run matching from a patient record first.");
      return;
    }
    try {
      const response = await applyToTrial({
        patient_email: patientSession.email,
        patient_id: activePatientIdForMatch,
        trial_id: trialId,
      });
      setAppliedTrials((prev) => ({ ...prev, [trialId]: response.status }));
      setPatientMessage(response.message);
    } catch (error) {
      setPatientError(error?.response?.data?.detail || "Unable to apply for trial.");
    }
  };

  const handleUploadPatientReport = async (requestItem) => {
    const selectedFile = reportFiles[requestItem.id];
    if (!selectedFile) {
      setPatientError("Please select a report file before uploading.");
      return;
    }

    setPatientError("");
    setPatientMessage("");
    setUploadingRequestId(requestItem.id);

    try {
      const response = await uploadPatientReport({
        requestId: requestItem.id,
        patientEmail: patientSession.email,
        file: selectedFile,
      });

      setPatientMessage(response.message);
      await loadPatientReportRequests();
      setReportFiles((prev) => {
        const next = { ...prev };
        delete next[requestItem.id];
        return next;
      });
    } catch (error) {
      setPatientError(error?.response?.data?.detail || "Unable to upload report.");
    } finally {
      setUploadingRequestId(null);
    }
  };

  const handleDoctorRequestReport = async (matchItem) => {
    if (!doctorSession?.email) return;

    const key = `${matchItem.patient_id}-${matchItem.trial_id}`;
    const requiredTests = (requiredTestsByMatchKey[key] || "").trim();
    if (!requiredTests) {
      setDoctorError("Please enter specific tests before notifying the patient.");
      return;
    }
    setRequestingReportKey(key);
    setDoctorError("");
    setDoctorMessage("");

    try {
      await requestPatientReport({
        doctor_email: doctorSession.email,
        patient_id: matchItem.patient_id,
        trial_id: matchItem.trial_id,
        message: "Please upload your latest report for trial eligibility verification.",
        required_tests: requiredTests,
      });
      setDoctorMessage(`Report request sent to ${matchItem.patient_id}. Patient has been notified.`);
      setRequiredTestsByMatchKey((prev) => ({ ...prev, [key]: "" }));
    } catch (error) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail || "Unable to request report from patient.";
      setDoctorError(detail);
      if (status === 409) {
        setDoctorToast({
          show: true,
          type: "warning",
          message: "Duplicate prevented: an active doctor request already exists for this patient and trial.",
        });
      }
    } finally {
      setRequestingReportKey("");
    }
  };

  const handleAnalyzeReport = async (reportId) => {
    if (!doctorSession?.email) return;

    setDoctorError("");
    setDoctorMessage("");
    setAnalyzingReportId(reportId);

    try {
      setAnalysisStep("Reading anonymized report...");
      setAnalysisProgress(20);
      await wait(700);

      setAnalysisStep("Validating biomarkers and disease stage...");
      setAnalysisProgress(50);
      await wait(700);

      setAnalysisStep("Cross-checking trial inclusion and exclusion criteria...");
      setAnalysisProgress(80);
      await wait(700);

      const response = await analyzeDoctorReport({
        doctor_email: doctorSession.email,
        report_id: reportId,
      });

      setAnalysisStep("Decision complete. Patient notified.");
      setAnalysisProgress(100);
      setDoctorMessage(response.analysis_notes);
      await loadDoctorReports();
      await wait(600);
    } catch (error) {
      setDoctorError(error?.response?.data?.detail || "Unable to analyze report.");
    } finally {
      setAnalyzingReportId(null);
      setAnalysisProgress(0);
      setAnalysisStep("");
    }
  };

  const handleForwardToResearcher = async (reportId) => {
    if (!doctorSession?.email) return;
    setDoctorError("");
    setDoctorMessage("");
    setForwardingReportId(reportId);
    try {
      const response = await createResearchReferral({
        doctor_email: doctorSession.email,
        report_id: reportId,
      });
      setDoctorMessage(response.message || "Report forwarded to researcher queue.");
      await loadDoctorResearchReferrals();
    } catch (error) {
      setDoctorError(error?.response?.data?.detail || "Unable to forward report to researcher.");
    } finally {
      setForwardingReportId(null);
    }
  };

  const handleSaveResearchRecommendation = async (referral) => {
    if (!doctorSession?.email) return;
    const form = researcherInputByReferralId[referral.id] || {};
    if (!(form.researcher_name || "").trim() || !(form.medicine_plan || "").trim()) {
      setDoctorError("Enter researcher name and medicine plan before saving.");
      return;
    }

    setSavingResearchReferralId(referral.id);
    setDoctorError("");
    setDoctorMessage("");
    try {
      const response = await saveResearchRecommendation({
        doctor_email: doctorSession.email,
        referral_id: referral.id,
        researcher_name: form.researcher_name,
        medicine_plan: form.medicine_plan,
        researcher_notes: form.researcher_notes || "",
      });
      setDoctorMessage(response.message || "Research recommendation saved.");
      await loadDoctorResearchReferrals();
    } catch (error) {
      setDoctorError(error?.response?.data?.detail || "Unable to save recommendation.");
    } finally {
      setSavingResearchReferralId(null);
    }
  };

  const handleShareResearchPlanToPatient = async (referralId) => {
    if (!doctorSession?.email) return;
    setSharingResearchReferralId(referralId);
    setDoctorError("");
    setDoctorMessage("");
    try {
      const response = await shareResearchPlanToPatient({
        doctor_email: doctorSession.email,
        referral_id: referralId,
      });
      setDoctorMessage(response.message || "Medicine plan shared with patient.");
      await loadDoctorResearchReferrals();
    } catch (error) {
      setDoctorError(error?.response?.data?.detail || "Unable to share medicine plan.");
    } finally {
      setSharingResearchReferralId(null);
    }
  };

  if (patientSession) {
    return (
      <div className="space-y-4 pb-6">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white shadow-soft sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/90">Patient Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold">Welcome, {patientSession.full_name}</h1>
          <p className="mt-2 text-sm text-white/90">Track your anonymized medical records and get matched to clinical trials.</p>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">🧾 Patient Medical Records ({patientRecords.length})</h2>
              <button type="button" className="btn-primary" onClick={() => setShowPatientForm(true)}>
                Fill Form Again
              </button>
            </div>
            {patientRecords.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No medical records yet. Fill the form to create your first patient record.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <div className="flex min-w-max gap-4 pb-2">
                  {patientRecords.map((record) => (
                    <article key={record.patient_id} className="w-72 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{record.patient_id}</p>
                      <p className="mt-1 text-xs text-slate-600">{record.disease} | Stage: {record.disease_stage || "N/A"}</p>
                      <p className="mt-1 text-xs text-slate-600">Age: {record.age} | Gender: {record.gender} | City: {record.city || "N/A"}</p>
                      <button type="button" className="btn-secondary mt-3" onClick={() => startTrialMatching(record.patient_id)}>
                        Start Matching
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-900">📨 Doctor Report Requests</h2>
            {patientReportRequests.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No pending report requests from doctors.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <div className="flex min-w-max gap-4 pb-2">
                  {patientReportRequests.map((requestItem) => (
                    <article key={requestItem.id} className="w-80 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">Trial: {requestItem.trial_id}</p>
                      <p className="mt-1 text-xs text-slate-600">Patient Ref: {requestItem.patient_id}</p>
                      <p className="mt-1 text-xs text-slate-600">Status: {requestItem.status}</p>
                      <p className="mt-1 text-xs text-slate-700">
                        Required Tests: {requestItem.required_tests || "Not specified"}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">Doctor is asking for your report. Upload to continue.</p>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <input
                          type="file"
                          accept=".txt,.pdf,.doc,.docx"
                          className="text-xs"
                          onChange={(event) => handleReportFileChange(requestItem.id, event.target.files?.[0] || null)}
                        />
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleUploadPatientReport(requestItem)}
                          disabled={uploadingRequestId === requestItem.id}
                        >
                          {uploadingRequestId === requestItem.id ? "Uploading..." : "Upload Report"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
        {patientAppointmentOptions.length > 0 && (
          <section ref={appointmentFormRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">📅 Book Appointment</h2>
              <button type="button" className="btn-secondary" onClick={() => setShowAppointmentForm((prev) => !prev)}>
                {showAppointmentForm ? "Hide Form" : "Open Form"}
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Choose the doctor and trial from your selected options, then schedule a date and time.
            </p>

            {showAppointmentForm && (
              <form onSubmit={handleBookAppointment} className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Patient Reference</span>
                  <select className="input-base" name="patient_id" value={appointmentFormData.patient_id} onChange={handleAppointmentFieldChange} required>
                    <option value="">Select patient reference</option>
                    {[...new Set(patientAppointmentOptions.map((item) => item.patient_id))].map((patientId) => (
                      <option key={patientId} value={patientId}>
                        {patientId}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Doctor Email</span>
                  <select className="input-base" name="doctor_email" value={appointmentFormData.doctor_email} onChange={handleAppointmentFieldChange} required>
                    <option value="">Select doctor</option>
                    {patientAppointmentOptions.map((item) => (
                      <option key={`${item.patient_id}-${item.doctor_email}-${item.trial_id}`} value={item.doctor_email}>
                        {item.doctor_email} ({item.hospital || "Hospital N/A"}, {item.city || "City N/A"})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Trial ID</span>
                  <select className="input-base" name="trial_id" value={appointmentFormData.trial_id} onChange={handleAppointmentFieldChange} required>
                    <option value="">Select trial</option>
                    {patientAppointmentOptions.map((item) => (
                      <option key={`${item.patient_id}-${item.trial_id}`} value={item.trial_id}>
                        {item.trial_id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Appointment Date</span>
                  <input className="input-base" type="date" name="appointment_date" value={appointmentFormData.appointment_date} onChange={handleAppointmentFieldChange} required />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Appointment Time</span>
                  <input className="input-base" type="time" name="appointment_time" value={appointmentFormData.appointment_time} onChange={handleAppointmentFieldChange} required />
                </label>
                <div className="sm:col-span-2">
                  <button type="submit" className="btn-primary" disabled={bookingAppointment}>
                    {bookingAppointment ? "Scheduling..." : "Schedule Appointment"}
                  </button>
                </div>
                {appointmentSuggestions.length > 0 && (
                  <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Suggested available slots: {appointmentSuggestions.join(" | ")}
                  </div>
                )}
              </form>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">🗓️ Your Appointments</h2>
          {patientAppointments.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No appointments scheduled yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <div className="flex min-w-max gap-3 pb-2">
              {patientAppointments.map((appointment) => (
                <article key={appointment.id} className="w-80 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Trial: {appointment.trial_id}</p>
                  <p className="mt-1 text-xs text-slate-600">Doctor: {appointment.doctor_name || appointment.doctor_email}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Date & Time: {appointment.appointment_date} at {appointment.appointment_time}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">Status: {appointment.status}</p>
                  {appointment.doctor_advice && (
                    <p className="mt-2 text-sm text-cyan-800">
                      Doctor Advice: {appointment.doctor_advice}
                    </p>
                  )}
                </article>
              ))}
              </div>
            </div>
          )}
        </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">💬 Post Appointment Follow-Up</h2>
          <p className="mt-2 text-sm text-slate-600">Follow-up is available 2 hours after doctor completes consultation.</p>
          {followupSafetyNotice && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {followupSafetyNotice}
            </p>
          )}

          {effectiveFollowupItems.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No completed appointments available for follow-up yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {effectiveFollowupItems.map((item) => {
                const remaining = item.followup_enabled ? 0 : getRemainingSecondsFromIso(item.followup_available_at);
                return (
                  <article key={`followup-${item.appointment_id}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Appointment #{item.appointment_id} | Trial {item.trial_id}</p>
                    {!item.followup_enabled ? (
                      <p className="mt-2 text-sm text-slate-700">Follow-up available in: {formatSeconds(remaining)}</p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className="btn-secondary" onClick={() => handlePatientOpenChat(item)}>
                          Text Message Doctor
                        </button>
                        <button type="button" className="btn-primary" onClick={() => handleRequestFollowup(item.appointment_id, "video")}>
                          Start Video Call
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => handleRequestFollowup(item.appointment_id, "text")}>
                          Request Text Follow-Up
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {patientFollowupVideoUrl && (
            <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-800">
              Video room ready:{" "}
              <a href={patientFollowupVideoUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                Join Video Call
              </a>
            </div>
          )}

          {selectedPatientFollowup && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Chat for Appointment #{selectedPatientFollowup.appointment_id}</p>
                <button type="button" className="btn-secondary" onClick={() => setSelectedPatientFollowup(null)}>
                  Close Chat
                </button>
              </div>
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                {loadingChat ? (
                  <p className="text-xs text-slate-500">Loading chat...</p>
                ) : chatMessages.length === 0 ? (
                  <p className="text-xs text-slate-500">No messages yet.</p>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={`pm-${msg.id}`} className={`rounded-md px-2 py-1 text-xs ${msg.sender_role === "patient" ? "bg-cyan-100 text-cyan-900" : "bg-slate-200 text-slate-800"}`}>
                      <p className="font-semibold">{msg.sender_role === "patient" ? "You" : "Doctor"}</p>
                      <p>{msg.message_text}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  className="input-base"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                />
                <button type="button" className="btn-primary" disabled={sendingChat} onClick={handlePatientSendChat}>
                  {sendingChat ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          )}

          <p className="mt-4 text-sm text-slate-700">
            Follow-up available in:{" "}
            <span className="font-bold text-slate-900">{formatSeconds(sectionCountdownSeconds)}</span>
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">💊 Personalized Medicine Plans (Doctor Shared)</h2>
          <p className="mt-2 text-xs text-slate-600">
            Researcher recommendations are anonymized and always routed through your doctor.
          </p>
          {patientMedicinePlans.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No personalized medicine plans shared yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {patientMedicinePlans.map((plan) => (
                <article key={`plan-${plan.referral_id}`} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Case: {plan.anonymized_case_id}</p>
                  <p className="mt-1 text-xs text-emerald-800">Trial: {plan.trial_id} | Status: {plan.status_bucket}</p>
                  <p className="mt-2 text-sm text-emerald-900">{plan.medicine_plan}</p>
                  {plan.researcher_notes && <p className="mt-2 text-xs text-emerald-800">Notes: {plan.researcher_notes}</p>}
                  <p className="mt-2 text-xs text-emerald-700">Shared by Doctor: {plan.doctor_email}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        {(showPatientForm || patientRecords.length === 0) && (
          <form onSubmit={submitPatientForm} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-900">🧬 Anonymized Patient Condition Form</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Age *</span>
                <select className="input-base" name="age" value={patientFormData.age} onChange={handlePatientChange} required>
                  <option value="">Select age</option>
                  {Array.from({ length: 100 }, (_, index) => index + 1).map((age) => (
                    <option key={`age-${age}`} value={age}>
                      {age}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Gender *</span>
                <select className="input-base" name="gender" value={patientFormData.gender} onChange={handlePatientChange} required>
                  <option value="">Select gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Disease *</span>
                <select className="input-base" name="disease" value={patientFormData.disease} onChange={handlePatientChange} required>
                  <option value="">Select disease</option>
                  <option value="lung cancer">Lung Cancer</option>
                  <option value="breast cancer">Breast Cancer</option>
                  <option value="ovarian cancer">Ovarian Cancer</option>
                  <option value="leukemia">Leukemia</option>
                  <option value="lymphoma">Lymphoma</option>
                  <option value="colorectal cancer">Colorectal Cancer</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Disease Stage</span>
                <select className="input-base" name="disease_stage" value={patientFormData.disease_stage} onChange={handlePatientChange}>
                  <option value="">Select stage</option>
                  <option value="I">I</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Biomarker</span>
                <select className="input-base" name="biomarker" value={patientFormData.biomarker} onChange={handlePatientChange}>
                  <option value="">Select biomarker</option>
                  <option value="EGFR+">EGFR+</option>
                  <option value="HER2+">HER2+</option>
                  <option value="PD-L1+">PD-L1+</option>
                  <option value="KRAS+">KRAS+</option>
                  <option value="BRAF+">BRAF+</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">City</span>
                <select className="input-base" name="city" value={patientFormData.city} onChange={handlePatientChange}>
                  <option value="">Select city</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Pune">Pune</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Hyderabad">Hyderabad</option>
                </select>
              </label>

              <label className="text-sm flex items-center gap-2"><input type="checkbox" name="diabetes" checked={patientFormData.diabetes} onChange={handlePatientChange} /><span>Diabetes</span></label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" name="hypertension" checked={patientFormData.hypertension} onChange={handlePatientChange} /><span>Hypertension</span></label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" name="heart_disease" checked={patientFormData.heart_disease} onChange={handlePatientChange} /><span>Heart Disease</span></label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" name="kidney_disease" checked={patientFormData.kidney_disease} onChange={handlePatientChange} /><span>Kidney Disease</span></label>

              <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Current Medications</span><input className="input-base" name="current_medications" value={patientFormData.current_medications} onChange={handlePatientChange} /></label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Smoking Status</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={patientFormData.smoking_status === "Yes" ? "btn-primary flex-1 py-2" : "btn-secondary flex-1 py-2"}
                    onClick={() => setPatientFormData((prev) => ({ ...prev, smoking_status: "Yes" }))}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={patientFormData.smoking_status === "No" ? "btn-primary flex-1 py-2" : "btn-secondary flex-1 py-2"}
                    onClick={() => setPatientFormData((prev) => ({ ...prev, smoking_status: "No" }))}
                  >
                    No
                  </button>
                </div>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium text-slate-700">Pregnancy Status</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={patientFormData.pregnancy_status === "Yes" ? "btn-primary flex-1 py-2" : "btn-secondary flex-1 py-2"}
                    onClick={() => setPatientFormData((prev) => ({ ...prev, pregnancy_status: "Yes" }))}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={patientFormData.pregnancy_status === "No" ? "btn-primary flex-1 py-2" : "btn-secondary flex-1 py-2"}
                    onClick={() => setPatientFormData((prev) => ({ ...prev, pregnancy_status: "No" }))}
                  >
                    No
                  </button>
                </div>
              </label>
              <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Lab Results</span><textarea className="input-base min-h-24 resize-y" name="lab_results" value={patientFormData.lab_results} onChange={handlePatientChange} /></label>
            </div>

            <div className="mt-5 flex gap-3">
              <button type="submit" className="btn-primary">Save Medical Record</button>
              {patientRecords.length > 0 && <button type="button" className="btn-secondary" onClick={() => setShowPatientForm(false)}>Cancel</button>}
            </div>
          </form>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">🎯 Recommended Clinical Trials</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <input className="input-base" placeholder="Filter by city" value={trialFilters.city} onChange={(e) => setTrialFilters((p) => ({ ...p, city: e.target.value }))} />
            <input className="input-base" placeholder="Filter by disease" value={trialFilters.disease} onChange={(e) => setTrialFilters((p) => ({ ...p, disease: e.target.value }))} />
            <input className="input-base" placeholder="Filter by trial phase" value={trialFilters.trial_phase} onChange={(e) => setTrialFilters((p) => ({ ...p, trial_phase: e.target.value }))} />
            <input className="input-base" type="number" min="0" max="100" placeholder="Min score" value={trialFilters.minimum_score} onChange={(e) => setTrialFilters((p) => ({ ...p, minimum_score: e.target.value }))} />
          </div>

          {isMatchingTrials && <p className="mt-3 text-sm text-slate-600">Matching clinical trials...</p>}
          {patientError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{patientError}</p>}
          {patientMessage && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{patientMessage}</p>}

          {recommendedTrials.length === 0 && !isMatchingTrials ? (
            <p className="mt-3 text-sm text-slate-500">Select a patient record and click Start Matching to view recommendations.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {recommendedTrials.map((trial) => (
                <article key={trial.trial_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{trial.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{trial.hospital || "N/A"} | {trial.city || "N/A"}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-lg font-bold text-primary">{trial.score}</p>
                    <StatusBadge status={trial.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" onClick={() => setExpandedTrialId((prev) => (prev === trial.trial_id ? "" : trial.trial_id))}>
                      View Explanation
                    </button>
                    <button type="button" className="btn-primary" onClick={() => applyForTrial(trial.trial_id)}>
                      {appliedTrials[trial.trial_id] === "confirmed"
                        ? "Confirmed"
                        : appliedTrials[trial.trial_id] === "waitlisted"
                          ? "Waitlisted"
                          : "Apply for Trial"}
                    </button>
                  </div>
                  {expandedTrialId === trial.trial_id && (
                    <div className="mt-3 space-y-3">
                      <ul className="space-y-1 text-xs text-slate-600">
                        {trial.explanation.map((line, index) => (
                          <li key={`${trial.trial_id}-${index}`}>- {line}</li>
                        ))}
                      </ul>
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold text-slate-800">Explainability Timeline</p>
                        <div className="mt-2 space-y-2">
                          {(trial.detailed_checks || []).map((check, index) => (
                            <div key={`${trial.trial_id}-check-${index}`} className="rounded-md border border-slate-100 bg-slate-50 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-slate-800">{check.criterion}</p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    check.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                  }`}
                                >
                                  {check.passed ? "PASS" : "FAIL"}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-600">{check.reason}</p>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-1.5 rounded-full ${check.passed ? "bg-emerald-500" : "bg-rose-500"}`}
                                  style={{ width: `${Math.min(Math.abs(check.contribution || 0) * 5, 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {rejectedTrials.length > 0 && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900">Why Some Trials Were Rejected</h3>
              <div className="mt-3 space-y-2">
                {rejectedTrials.slice(0, 4).map((trial) => (
                  <article key={`rejected-${trial.trial_id}`} className="rounded-lg border border-amber-100 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-900">{trial.title}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Score: {trial.score} | {(trial.rejection_reasons || []).join(", ") || "Below minimum score"}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <MatchAnalytics matchResults={recommendedTrials} />
      </div>
    );
  }

  if (doctorSession) {
    return (
      <div className="space-y-6 pb-8">
        {doctorToast.show && (
          <div className="fixed right-5 top-20 z-50 max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-soft">
            {doctorToast.message}
          </div>
        )}
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-500 p-7 text-white shadow-soft sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/90">Doctor Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold">Welcome, Dr. {doctorSession.full_name}</h1>
          <p className="mt-2 text-sm text-white/90">Register clinical trials and manage your trial postings.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">🎬 Jury Walkthrough</h2>
            {!juryWalkthroughActive ? (
              <button type="button" className="btn-primary" onClick={startJuryWalkthrough}>
                Jury Walkthrough Mode
              </button>
            ) : (
              <button type="button" className="btn-secondary" onClick={stopJuryWalkthrough}>
                Stop Walkthrough
              </button>
            )}
          </div>
          {juryWalkthroughActive ? (
            <p className="mt-2 text-xs text-cyan-700">
              Step {juryWalkthroughIndex + 1}/{juryWalkthroughSteps.length}: {juryWalkthroughSteps[juryWalkthroughIndex].replaceAll("_", " ")}
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-600">Auto-scrolls and highlights key sections for live jury demo.</p>
          )}
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.fairness = el;
          }}
          className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-soft ${getSectionClass("fairness")}`}
        >
          <h2 className="text-lg font-semibold text-slate-900">⚖️ Fairness & Bias Snapshot</h2>
          {fairnessSnapshot ? (
            <>
              <p className="mt-2 text-sm text-slate-700">Overall Match Rate: {(fairnessSnapshot.overall_match_rate * 100).toFixed(0)}%</p>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                {[
                  { title: "By Gender", values: fairnessSnapshot.by_gender || [] },
                  { title: "By Age Band", values: fairnessSnapshot.by_age_band || [] },
                  { title: "By City", values: fairnessSnapshot.by_city || [] },
                ].map((group) => (
                  <article key={group.title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">{group.title}</p>
                    <div className="mt-2 space-y-2">
                      {group.values.map((item) => (
                        <div key={`${group.title}-${item.cohort}`}>
                          <div className="flex items-center justify-between text-xs text-slate-700">
                            <span>{item.cohort}</span>
                            <span className={item.is_skewed ? "text-rose-700" : "text-slate-700"}>
                              {(item.match_rate * 100).toFixed(0)}% {item.is_skewed ? "(Skew)" : ""}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-1.5 rounded-full ${item.is_skewed ? "bg-rose-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.max(item.match_rate * 100, 4)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              {(fairnessSnapshot.alerts || []).length > 0 && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {(fairnessSnapshot.alerts || []).map((alert, index) => (
                    <p key={`alert-${index}`}>- {alert}</p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Fairness snapshot unavailable.</p>
          )}
        </section>

        <form
          ref={(el) => {
            sectionRefs.current.clinical_trial_form = el;
          }}
          onSubmit={submitTrialForm}
          className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-soft ${getSectionClass("clinical_trial_form")}`}
        >
          <h2 className="text-lg font-semibold text-slate-900">🧪 Clinical Trial Registration</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Trial ID *</span><input className="input-base" name="trial_id" value={trialFormData.trial_id} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Trial Title *</span><input className="input-base" name="trial_title" value={trialFormData.trial_title || trialFormData.title} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Disease *</span><input className="input-base" name="disease_required" value={trialFormData.disease_required} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Trial Phase *</span><input className="input-base" name="trial_phase" value={trialFormData.trial_phase || trialFormData.phase} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Min Age</span><input className="input-base" type="number" name="min_age" value={trialFormData.min_age} onChange={handleTrialFormChange} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Max Age</span><input className="input-base" type="number" name="max_age" value={trialFormData.max_age} onChange={handleTrialFormChange} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Disease Stage</span><input className="input-base" name="disease_stage" value={trialFormData.disease_stage} onChange={handleTrialFormChange} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Biomarker Required</span><input className="input-base" name="biomarker_required" value={trialFormData.biomarker_required} onChange={handleTrialFormChange} /></label>

            <label className="text-sm flex items-center gap-2"><input type="checkbox" name="exclusion_diabetes" checked={trialFormData.exclusion_diabetes} onChange={handleTrialFormChange} /><span>Exclude Diabetes</span></label>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" name="exclusion_heart_disease" checked={trialFormData.exclusion_heart_disease} onChange={handleTrialFormChange} /><span>Exclude Heart Disease</span></label>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" name="exclusion_pregnancy" checked={trialFormData.exclusion_pregnancy} onChange={handleTrialFormChange} /><span>Exclude Pregnancy</span></label>

            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Hospital *</span><input className="input-base" name="hospital" value={trialFormData.hospital} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">City *</span><input className="input-base" name="city" value={trialFormData.city} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Country *</span><input className="input-base" name="country" value={trialFormData.country} onChange={handleTrialFormChange} required /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Start Date</span><input className="input-base" type="date" name="start_date" value={trialFormData.start_date} onChange={handleTrialFormChange} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">End Date</span><input className="input-base" type="date" name="end_date" value={trialFormData.end_date} onChange={handleTrialFormChange} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Max Participants</span><input className="input-base" type="number" name="max_participants" value={trialFormData.max_participants} onChange={handleTrialFormChange} /></label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">Eligibility Criteria Text</span>
              <textarea
                className="input-base min-h-24 resize-y"
                name="criteria_text"
                value={trialFormData.criteria_text}
                onChange={handleTrialFormChange}
                placeholder="Patients aged 40-65 with Stage II lung cancer. Patients with severe heart disease are excluded."
              />
              <button
                type="button"
                className="btn-secondary mt-3"
                onClick={handleParseCriteria}
                disabled={isParsingCriteria}
              >
                {isParsingCriteria ? "Parsing..." : "Parse Eligibility Criteria"}
              </button>
            </label>
          </div>

          {parsedCriteria && (
            <section className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
              <h3 className="font-semibold">Eligibility Criteria Parsed</h3>
              <p className="mt-1">Min Age: {parsedCriteria.min_age ?? "Not found"}</p>
              <p>Max Age: {parsedCriteria.max_age ?? "Not found"}</p>
              <p>Disease: {parsedCriteria.disease || "Not found"}</p>
              <p>Stage: {parsedCriteria.stage || "Not found"}</p>
              <p>Biomarker: {parsedCriteria.biomarker || "Not found"}</p>
              <p>Excluded Conditions: {(parsedCriteria.exclude_conditions || []).join(", ") || "None detected"}</p>
              <p className="mt-2 font-medium">Status: {parsedCriteria.status}</p>
              {parsedCriteria.status === "partial" && <p>{parsedCriteria.message}</p>}
            </section>
          )}

          {criteriaQA && (
            <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <h3 className="font-semibold">Eligibility Criteria QA Assistant</h3>
              <p className="mt-1">Completeness Score: {criteriaQA.completeness_score}/100</p>
              {criteriaQA.warnings?.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs">
                  {criteriaQA.warnings.map((warning, index) => (
                    <li key={`warning-${index}`}>- {warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs">No ambiguity warnings detected.</p>
              )}
              {criteriaQA.suggestions?.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {criteriaQA.suggestions.map((suggestion, index) => (
                    <li key={`suggestion-${index}`}>- Suggestion: {suggestion}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="mt-5">
            <button type="submit" className="btn-primary" disabled={isSavingTrial}>{isSavingTrial ? "Saving..." : "Register Clinical Trial"}</button>
          </div>
          {doctorError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{doctorError}</p>}
          {doctorMessage && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{doctorMessage}</p>}
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">📚 Your Registered Clinical Trials</h2>
          {doctorTrials.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No clinical trials registered yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {doctorTrials.map((trial) => (
                <article key={trial.trial_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{trial.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{trial.trial_id} | {trial.phase}</p>
                  <p className="text-sm text-slate-600">Disease: {trial.disease || "N/A"}</p>
                  <p className="text-sm text-slate-600">{trial.hospital} | {trial.city}</p>
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Eligible Patients ({(matchedPatientsByTrial[trial.trial_id] || []).length})
                    </p>
                    {(matchedPatientsByTrial[trial.trial_id] || []).length === 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        No patients found for {trial.disease || "this disease"} yet.
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(matchedPatientsByTrial[trial.trial_id] || []).slice(0, 8).map((item) => (
                          <span
                            key={`${trial.trial_id}-${item.patient_id}`}
                            className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700"
                          >
                            {item.patient_id}
                          </span>
                        ))}
                        {(matchedPatientsByTrial[trial.trial_id] || []).length > 8 && (
                          <span className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600">
                            +{(matchedPatientsByTrial[trial.trial_id] || []).length - 8} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.matched_patients = el;
          }}
          className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-soft ${getSectionClass("matched_patients")}`}
        >
          <h2 className="text-lg font-semibold text-slate-900">🧑‍🤝‍🧑 Top Matching Patients</h2>
          {isLoadingDoctorMatches ? (
            <p className="mt-3 text-sm text-slate-600">Loading matched patients...</p>
          ) : doctorMatchedPatients.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No patient matches above threshold yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {doctorMatchedPatients.map((item) => {
                const key = `${item.patient_id}-${item.trial_id}`;
                return (
                  <article key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{item.patient_id}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">Disease: {item.disease} | City: {item.city || "N/A"}</p>
                    <p className="text-sm text-slate-600">Best Trial: {item.trial_title}</p>
                    <p className="mt-2 text-lg font-bold text-primary">{item.score}%</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {item.explanation.slice(0, 3).map((line, index) => (
                        <li key={`${item.patient_id}-${index}`}>- {line}</li>
                      ))}
                    </ul>
                    <label className="mt-3 block text-xs text-slate-700">
                      Specific Tests Required (comma separated)
                      <input
                        className="input-base mt-1"
                        placeholder="e.g. CBC, EGFR Mutation Test, PET-CT"
                        value={requiredTestsByMatchKey[key] || ""}
                        onChange={(event) =>
                          setRequiredTestsByMatchKey((prev) => ({ ...prev, [key]: event.target.value }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="btn-primary mt-3"
                      onClick={() => handleDoctorRequestReport(item)}
                      disabled={requestingReportKey === key}
                    >
                      {requestingReportKey === key ? "Notifying..." : "Notify Patient For Report"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.appointments = el;
          }}
          className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-soft ${getSectionClass("appointments")}`}
        >
          <h2 className="text-lg font-semibold text-slate-900">📅 Booked Appointments</h2>
          {doctorAppointments.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No appointments booked yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {doctorAppointments.map((appointment) => (
                <article key={appointment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Patient Ref: {appointment.patient_id}</p>
                  <p className="mt-1 text-xs text-slate-600">Trial: {appointment.trial_id}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Schedule: {appointment.appointment_date} at {appointment.appointment_time}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">Status: {appointment.status}</p>
                  {appointment.followup_available_at && (
                    <p className="mt-1 text-xs text-slate-600">Follow-up unlocks at: {appointment.followup_available_at}</p>
                  )}
                  <label className="mt-3 block text-xs text-slate-700">
                    Special Advice
                    <textarea
                      className="input-base mt-1 min-h-20 resize-y"
                      placeholder="e.g. Maintain fast for 8 hours before consultation."
                      value={doctorAdviceByAppointmentId[appointment.id] || ""}
                      onChange={(event) => handleDoctorAdviceChange(appointment.id, event.target.value)}
                    />
                  </label>
                  <button type="button" className="btn-primary mt-3" onClick={() => handleDoctorAdviceSubmit(appointment.id)}>
                    Send Advice
                  </button>
                  <button
                    type="button"
                    className="btn-secondary mt-2"
                    disabled={appointment.status === "completed" || processingCompleteAppointmentId === appointment.id}
                    onClick={() => handleCompleteAppointment(appointment.id)}
                  >
                    {processingCompleteAppointmentId === appointment.id
                      ? "Completing..."
                      : appointment.status === "completed"
                        ? "Appointment Completed"
                        : "Complete Appointment"}
                  </button>
                  {appointment.doctor_advice && (
                    <p className="mt-2 text-xs text-cyan-800">Latest Advice: {appointment.doctor_advice}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">🔔 New Follow-Up Requests</h2>
          {doctorFollowupRequests.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No follow-up requests yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {doctorFollowupRequests.map((item) => (
                <article key={`fup-${item.id}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Patient: {item.patient_id}</p>
                  <p className="mt-1 text-xs text-slate-600">Follow-up requested after consultation</p>
                  <p className="mt-1 text-xs text-slate-600">Mode: {item.mode}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" onClick={() => handleDoctorOpenChat(item)}>
                      Open Chat
                    </button>
                    {item.video_url && (
                      <a className="btn-primary" href={item.video_url} target="_blank" rel="noreferrer">
                        Join Video Call
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {selectedDoctorFollowup && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Chat for Appointment #{selectedDoctorFollowup.appointment_id}</p>
                <button type="button" className="btn-secondary" onClick={() => setSelectedDoctorFollowup(null)}>
                  Close Chat
                </button>
              </div>
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                {doctorLoadingChat ? (
                  <p className="text-xs text-slate-500">Loading chat...</p>
                ) : doctorChatMessages.length === 0 ? (
                  <p className="text-xs text-slate-500">No messages yet.</p>
                ) : (
                  doctorChatMessages.map((msg) => (
                    <div key={`dm-${msg.id}`} className={`rounded-md px-2 py-1 text-xs ${msg.sender_role === "doctor" ? "bg-cyan-100 text-cyan-900" : "bg-slate-200 text-slate-800"}`}>
                      <p className="font-semibold">{msg.sender_role === "doctor" ? "You" : "Patient"}</p>
                      <p>{msg.message_text}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  className="input-base"
                  placeholder="Type your message..."
                  value={doctorChatInput}
                  onChange={(event) => setDoctorChatInput(event.target.value)}
                />
                <button type="button" className="btn-primary" disabled={doctorSendingChat} onClick={handleDoctorSendChat}>
                  {doctorSendingChat ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.privacy_logs = el;
          }}
          className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-soft ${getSectionClass("privacy_logs")}`}
        >
          <h2 className="text-lg font-semibold text-slate-900">🔒 Privacy Guard Logs</h2>
          {privacyLogs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No redaction logs yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {privacyLogs.slice(0, 8).map((log) => (
                <article key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-900">{log.entity_type} ({log.entity_id || "N/A"})</p>
                  <p className="mt-1 text-xs text-slate-600">Findings: {log.findings || "none"} | {log.created_at}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section
          ref={(el) => {
            sectionRefs.current.reports = el;
          }}
          className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-soft ${getSectionClass("reports")}`}
        >
          <h2 className="text-lg font-semibold text-slate-900">📄 Verified Anonymized Patient Reports</h2>
          {isLoadingDoctorReports ? (
            <p className="mt-3 text-sm text-slate-600">Loading verified reports...</p>
          ) : doctorReports.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No verified reports available yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {doctorReports.map((report) => (
                <article key={report.report_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Patient Ref: {report.patient_id}</p>
                  <p className="mt-1 text-xs text-slate-600">Trial: {report.trial_id}</p>
                  <p className="text-xs text-slate-600">File: {report.file_name || "Uploaded report"}</p>
                  <p className="mt-2 text-sm text-slate-700">{report.redacted_summary || "No redacted text available."}</p>

                  {analyzingReportId === report.report_id && (
                    <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                      <p className="text-sm font-medium text-cyan-900">{analysisStep}</p>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-cyan-100">
                        <div
                          className="h-2 rounded-full bg-cyan-500 transition-all duration-500"
                          style={{ width: `${analysisProgress}%` }}
                        />
                      </div>
                      <div className="mt-2 flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-500" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-500 [animation-delay:120ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-500 [animation-delay:240ms]" />
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleAnalyzeReport(report.report_id)}
                      disabled={analyzingReportId === report.report_id || report.selected}
                    >
                      {report.selected ? "Selected" : analyzingReportId === report.report_id ? "Analyzing..." : "Analyze Report"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleForwardToResearcher(report.report_id)}
                      disabled={forwardingReportId === report.report_id || report.analysis_status !== "completed"}
                    >
                      {forwardingReportId === report.report_id ? "Forwarding..." : "Send To Researcher"}
                    </button>
                    {report.selected && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Patient Selected</span>}
                  </div>

                  {report.analysis_notes && <p className="mt-2 text-xs text-slate-600">{report.analysis_notes}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">🧪 Researcher Relay (Doctor as Middleman)</h2>
          <p className="mt-1 text-xs text-slate-600">
            Researcher receives only anonymized case data. No direct patient-researcher channel exists.
          </p>
          {doctorResearchReferrals.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No referrals sent yet. Analyze a report and click "Send To Researcher".</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {doctorResearchReferrals.map((referral) => {
                const form = researcherInputByReferralId[referral.id] || {};
                const canShare = referral.recommendation_status === "recommended" && !referral.shared_to_patient;
                return (
                  <article key={referral.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{referral.anonymized_case_id}</p>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${referral.recommendation_status === "recommended" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {referral.recommendation_status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">Trial: {referral.trial_id} | Disease: {referral.disease || "N/A"}</p>
                    <p className="text-xs text-slate-600">Status bucket: {referral.status_bucket}</p>
                    {referral.template_applied && (
                      <p className="mt-1 text-xs font-semibold text-cyan-700">Template auto-applied for this disease/status.</p>
                    )}
                    <p className="mt-2 text-xs text-slate-700">{referral.report_snapshot || "No snapshot available."}</p>

                    <div className="mt-3 space-y-2">
                      <input
                        className="input-base"
                        placeholder="Researcher name"
                        value={form.researcher_name ?? referral.researcher_name ?? ""}
                        onChange={(event) =>
                          setResearcherInputByReferralId((prev) => ({
                            ...prev,
                            [referral.id]: { ...prev[referral.id], researcher_name: event.target.value },
                          }))
                        }
                      />
                      <textarea
                        className="input-base min-h-24 resize-y"
                        placeholder="Recommended medicine plan (anonymized, status-based)."
                        value={form.medicine_plan ?? referral.medicine_plan ?? ""}
                        onChange={(event) =>
                          setResearcherInputByReferralId((prev) => ({
                            ...prev,
                            [referral.id]: { ...prev[referral.id], medicine_plan: event.target.value },
                          }))
                        }
                      />
                      <textarea
                        className="input-base min-h-20 resize-y"
                        placeholder="Research notes (optional)"
                        value={form.researcher_notes ?? referral.researcher_notes ?? ""}
                        onChange={(event) =>
                          setResearcherInputByReferralId((prev) => ({
                            ...prev,
                            [referral.id]: { ...prev[referral.id], researcher_notes: event.target.value },
                          }))
                        }
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={savingResearchReferralId === referral.id}
                        onClick={() => handleSaveResearchRecommendation(referral)}
                      >
                        {savingResearchReferralId === referral.id ? "Saving..." : "Save Research Recommendation"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={!canShare || sharingResearchReferralId === referral.id}
                        onClick={() => handleShareResearchPlanToPatient(referral.id)}
                      >
                        {sharingResearchReferralId === referral.id ? "Sharing..." : "Share To Patient"}
                      </button>
                      {referral.shared_to_patient && (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Shared with patient
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-soft sm:p-10">
        <p className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          CureNova Dashboard
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">Select User Type</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          Login to open your personalized dashboard with patient records and clinical trial workflows.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className={activeRole === "patient" ? "btn-primary" : "btn-secondary"} onClick={() => setActiveRole("patient")}>Patient</button>
          <button type="button" className={activeRole === "doctor" ? "btn-primary" : "btn-secondary"} onClick={() => setActiveRole("doctor")}>Doctor</button>
        </div>
      </section>

      {activeRole === "patient" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          New patient? Register first. Returning patient? Login.
          <div className="mt-3 flex gap-3">
            <button type="button" className="btn-primary" onClick={() => navigate("/login?role=patient&mode=register")}>Register Patient</button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/login?role=patient&mode=login")}>Login Patient</button>
          </div>
        </div>
      )}

      {activeRole === "doctor" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          New doctor? Register first. Returning doctor? Login.
          <div className="mt-3 flex gap-3">
            <button type="button" className="btn-primary" onClick={() => navigate("/login?role=doctor&mode=register")}>Register Doctor</button>
            <button type="button" className="btn-secondary" onClick={() => navigate("/login?role=doctor&mode=login")}>Login Doctor</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
