import axios from 'axios';

axios.defaults.baseURL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL : window.REACT_APP_API_URL; //eslint-disable-line

const accessToken = localStorage.getItem('accessToken'); // eslint-disable-line no-undef
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };

export const createShortUrl = obj => { //eslint-disable-line
  const requestUrl = 'link';
  return axios.post(requestUrl, obj, { headers });
};
