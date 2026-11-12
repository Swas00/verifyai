import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("verifyai_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function login(email, password) {
  return api.post("/auth/login", { email, password }).then((res) => res.data);
}

export function screenDocument(documentFile, selfieFile) {
  const form = new FormData();
  form.append("document", documentFile);
  form.append("selfie", selfieFile);
  return api
    .post("/screening/screen", form, { headers: { "Content-Type": "multipart/form-data" } })
    .then((res) => res.data);
}

export function listCases(page = 1, limit = 20) {
  return api.get("/cases", { params: { page, limit } }).then((res) => res.data);
}

export function getCase(id) {
  return api.get(`/cases/${id}`).then((res) => res.data);
}

export function verifyAuditChain() {
  return api.get("/audit/verify").then((res) => res.data);
}

export default api;
