import React, { useEffect } from 'react';

function RedirectToApi() {
  useEffect(() => {
    const currentPath = window.location.pathname;

    // If the path matches your desired pattern, redirect to the API
    if (/^[0-9a-z!?@_-]{1,99}$/.test(currentPath.slice(1))) {
      window.location.href = `https://yo-api.fairbanks.dev/api/link${currentPath}`;
    } else {
      // Handle non-matching routes, e.g., show a 404 page
      window.location.href = '/';
    }
  }, []);

  return <div>Yo dawg...</div>;
}

export default RedirectToApi;
