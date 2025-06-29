import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router/router.jsx';
import './styles/global.css';
import './styles/reset.css';

import axios from 'axios';
import useUserStore from './store/useUserStore';

function RootWrapper() {
  const { setUser, clearUser, setLoading } = useUserStore();
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/user/me`, {
          withCredentials: true,
        });
        setUser(res.data);
      } catch (err) {
        const status = err?.response?.status;

        if (status === 401) {
        } else {
          console.error('세션 확인 중 에러 발생:', err);
        }

        clearUser();
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootWrapper />
  </React.StrictMode>,
);
