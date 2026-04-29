import axios from "axios";
import { getApiBaseUrl } from "./config";

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

export default api;
