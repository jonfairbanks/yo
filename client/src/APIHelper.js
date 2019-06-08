import axios from "axios";
import constants from "./config/config";
axios.defaults.baseURL = constants.apiUrl;

export const createShortUrl = obj => {
  const requestUrl = "link";
  return axios.post(requestUrl, obj);
};
