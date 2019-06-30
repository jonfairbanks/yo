import axios from "axios";
axios.defaults.baseURL = process.env.REACT_APP_API_URL;

var accessToken = localStorage.getItem("accessToken");
const headers = { 'Content-Type': 'application/json', 'Authorization': "Bearer " + accessToken }

export const createShortUrl = obj => {
  const requestUrl = "link";
  return axios.post(requestUrl, obj, {headers: headers});
};
