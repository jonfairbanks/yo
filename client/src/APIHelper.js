import axios from "axios";
import constants from "./config/config";
axios.defaults.baseURL = constants.apiUrl;

var accessToken = localStorage.getItem("accessToken");
const headers = { 'Content-Type': 'application/json', 'Authorization': "Bearer " + accessToken }

export const createShortUrl = obj => {
  const requestUrl = "link";
  return axios.post(requestUrl, obj, {headers: headers});
};
